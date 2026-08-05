import type { TextDocumentLike, TaggedYamlBlock } from "./yaml-blocks";

export interface TextPosition {
  readonly line: number;
  readonly character: number;
}

export interface TextSpan {
  readonly start: TextPosition;
  readonly end: TextPosition;
}

export interface XmlTagRegion extends TextSpan {
  readonly kind: "open" | "close" | "self-closing";
  readonly name: string;
}

export interface XmlPair {
  readonly open: XmlTagRegion;
  readonly close: XmlTagRegion;
  readonly content: TextSpan;
}

export interface XmlRegions {
  readonly tags: readonly XmlTagRegion[];
  readonly pairs: readonly XmlPair[];
}

interface ParsedTag {
  readonly end: number;
  readonly kind: XmlTagRegion["kind"];
  readonly name: string;
}

interface Fence {
  readonly character: "`" | "~";
  readonly length: number;
}

function inlineCodeSpans(line: string): readonly (readonly [number, number])[] {
  const spans: (readonly [number, number])[] = [];
  let cursor = 0;

  while (cursor < line.length) {
    if (line[cursor] !== "`") {
      cursor += 1;
      continue;
    }

    let markerEnd = cursor + 1;
    while (line[markerEnd] === "`") markerEnd += 1;
    const marker = line.slice(cursor, markerEnd);
    const close = line.indexOf(marker, markerEnd);
    if (close === -1) {
      cursor = markerEnd;
      continue;
    }

    spans.push([cursor, close + marker.length]);
    cursor = close + marker.length;
  }

  return spans;
}

function isInsideSpan(
  character: number,
  spans: readonly (readonly [number, number])[],
): boolean {
  return spans.some(([start, end]) => character >= start && character < end);
}

function fenceMarker(line: string): Fence | undefined {
  const match = /^\s*(`{3,}|~{3,})/.exec(line);
  const marker = match?.[1];
  if (marker === undefined) return undefined;
  const character = marker[0];
  if (character !== "`" && character !== "~") return undefined;
  return { character, length: marker.length };
}

function closesFence(line: string, fence: Fence): boolean {
  const trimmed = line.trim();
  if (!trimmed.startsWith(fence.character.repeat(fence.length))) return false;
  return [...trimmed].every((character) => character === fence.character);
}

function parseTagAt(line: string, start: number): ParsedTag | undefined {
  if (line[start] !== "<") return undefined;

  let cursor = start + 1;
  let kind: ParsedTag["kind"] = "open";
  if (line[cursor] === "/") {
    kind = "close";
    cursor += 1;
  }

  const nameMatch = /^[A-Za-z][\w:.-]*/.exec(line.slice(cursor));
  const name = nameMatch?.[0];
  if (name === undefined) return undefined;
  cursor += name.length;
  if (!/[\s/>]/.test(line[cursor] ?? "")) return undefined;

  let quote: "single" | "double" | undefined;
  for (; cursor < line.length; cursor += 1) {
    const character = line[cursor];
    if (quote === "double") {
      if (character === '"' && line[cursor - 1] !== "\\") quote = undefined;
      continue;
    }
    if (quote === "single") {
      if (character === "'") quote = undefined;
      continue;
    }
    if (character === '"') {
      quote = "double";
    } else if (character === "'") {
      quote = "single";
    } else if (character === "<") {
      return undefined;
    } else if (character === ">") {
      if (kind === "open" && /\/\s*$/.test(line.slice(start, cursor))) {
        kind = "self-closing";
      }
      return { end: cursor + 1, kind, name };
    }
  }

  return undefined;
}

export function findXmlRegions(
  document: TextDocumentLike,
  blocks: readonly TaggedYamlBlock[],
): XmlRegions {
  const tags: XmlTagRegion[] = [];
  const pairs: XmlPair[] = [];

  for (const block of blocks) {
    if (block.language !== "markdown") continue;

    const openTags: XmlTagRegion[] = [];
    let fence: Fence | undefined;
    let inComment = false;

    for (
      let lineNumber = block.contentStartLine;
      lineNumber < block.endLineExclusive;
      lineNumber += 1
    ) {
      const line = document.lineAt(lineNumber).text;
      const marker = fenceMarker(
        line.slice(Math.min(block.contentIndent, line.length)),
      );
      if (fence !== undefined) {
        if (marker !== undefined && closesFence(line, fence)) fence = undefined;
        continue;
      }
      if (marker !== undefined) {
        fence = marker;
        continue;
      }

      const codeSpans = inlineCodeSpans(line);
      let cursor = 0;
      while (cursor < line.length) {
        if (inComment) {
          const commentEnd = line.indexOf("-->", cursor);
          if (commentEnd === -1) break;
          inComment = false;
          cursor = commentEnd + 3;
          continue;
        }

        const commentStart = line.indexOf("<!--", cursor);
        const tagStart = line.indexOf("<", cursor);
        if (tagStart === -1) break;
        if (commentStart !== -1 && commentStart === tagStart) {
          const commentEnd = line.indexOf("-->", commentStart + 4);
          if (commentEnd === -1) {
            inComment = true;
            break;
          }
          cursor = commentEnd + 3;
          continue;
        }
        if (isInsideSpan(tagStart, codeSpans)) {
          cursor = tagStart + 1;
          continue;
        }

        const parsed = parseTagAt(line, tagStart);
        if (parsed === undefined) {
          cursor = tagStart + 1;
          continue;
        }

        const tag: XmlTagRegion = {
          start: { line: lineNumber, character: tagStart },
          end: { line: lineNumber, character: parsed.end },
          kind: parsed.kind,
          name: parsed.name,
        };
        tags.push(tag);

        if (tag.kind === "open") {
          openTags.push(tag);
        } else if (tag.kind === "close") {
          const open = openTags.at(-1);
          if (open?.name === tag.name) {
            openTags.pop();
            pairs.push({
              open,
              close: tag,
              content: { start: open.end, end: tag.start },
            });
          }
        }

        cursor = parsed.end;
      }
    }
  }

  return { tags, pairs };
}

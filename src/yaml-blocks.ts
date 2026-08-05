import { LANGUAGE_BY_TAG } from "./languages";
import type { EmbeddedLanguageId } from "./languages";

export interface TextLine {
  readonly text: string;
}

export interface TextDocumentLike {
  readonly lineCount: number;
  lineAt(line: number): TextLine;
}

export interface TaggedYamlBlock {
  readonly headerLine: number;
  readonly contentStartLine: number;
  readonly endLineExclusive: number;
  readonly contentIndent: number;
  readonly language: EmbeddedLanguageId;
  readonly tag: string;
}

interface TaggedScalarHeader {
  readonly contextIndent: number;
  readonly explicitIndent: number | undefined;
  readonly language: EmbeddedLanguageId;
  readonly tag: string;
}

const TAG_START_BOUNDARY = /[\s,:?[\]{}-]/;
const SCALAR_HEADER = /^([|>])(?:([1-9])([+-])?|([+-])([1-9])?)?$/;

function withoutYamlComment(line: string): string {
  let quote: "single" | "double" | undefined;
  let escaped = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === undefined) break;

    if (quote === "double") {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        quote = undefined;
      }
      continue;
    }

    if (quote === "single") {
      if (character === "'" && line[index + 1] === "'") {
        index += 1;
      } else if (character === "'") {
        quote = undefined;
      }
      continue;
    }

    if (character === '"') {
      quote = "double";
    } else if (character === "'") {
      quote = "single";
    } else if (
      character === "#" &&
      (index === 0 || /\s/.test(line[index - 1] ?? ""))
    ) {
      return line.slice(0, index).trimEnd();
    }
  }

  return line.trimEnd();
}

function findSupportedTag(
  line: string,
):
  | { readonly end: number; readonly index: number; readonly tag: string }
  | undefined {
  let quote: "single" | "double" | undefined;
  let escaped = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === undefined) break;

    if (quote === "double") {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        quote = undefined;
      }
      continue;
    }

    if (quote === "single") {
      if (character === "'" && line[index + 1] === "'") {
        index += 1;
      } else if (character === "'") {
        quote = undefined;
      }
      continue;
    }

    if (character === '"') {
      quote = "double";
      continue;
    }
    if (character === "'") {
      quote = "single";
      continue;
    }
    if (character !== "!") continue;

    const previous = line[index - 1];
    if (previous !== undefined && !TAG_START_BOUNDARY.test(previous)) continue;

    const tagMatch = /^[A-Za-z][\w-]*/.exec(line.slice(index + 1));
    const tag = tagMatch?.[0];
    if (tag === undefined || !LANGUAGE_BY_TAG.has(tag)) continue;

    const end = index + 1 + tag.length;
    if (!/\s/.test(line[end] ?? "")) continue;
    return { end, index, tag };
  }

  return undefined;
}

function findContextIndent(line: string, tagIndex: number): number {
  const prefix = line.slice(0, tagIndex);
  let cursor = /^ */.exec(prefix)?.[0].length ?? 0;

  while (cursor < prefix.length) {
    const marker = prefix[cursor];
    if (marker !== "-" && marker !== "?" && marker !== ":") break;
    if (prefix[cursor + 1] !== " ") break;
    cursor += 1;
    while (prefix[cursor] === " ") cursor += 1;
  }

  return cursor;
}

function parseTaggedScalarHeader(line: string): TaggedScalarHeader | undefined {
  if (/^\s*#/.test(line) || /^\t/.test(line)) return undefined;

  const code = withoutYamlComment(line);
  const tagMatch = findSupportedTag(code);
  if (tagMatch === undefined) return undefined;

  let remainder = code.slice(tagMatch.end).trimStart();
  const anchorMatch = /^&[^\s]+\s+/.exec(remainder);
  if (anchorMatch !== null) remainder = remainder.slice(anchorMatch[0].length);

  const scalarMatch = SCALAR_HEADER.exec(remainder);
  if (scalarMatch === null) return undefined;

  const definition = LANGUAGE_BY_TAG.get(tagMatch.tag);
  if (definition === undefined) return undefined;

  const explicitIndentText = scalarMatch[2] ?? scalarMatch[5];
  return {
    contextIndent: findContextIndent(code, tagMatch.index),
    explicitIndent:
      explicitIndentText === undefined
        ? undefined
        : Number.parseInt(explicitIndentText, 10),
    language: definition.id,
    tag: tagMatch.tag,
  };
}

function leadingSpaces(line: string): number {
  return /^ */.exec(line)?.[0].length ?? 0;
}

export function findTaggedYamlBlocks(
  document: TextDocumentLike,
): readonly TaggedYamlBlock[] {
  const blocks: TaggedYamlBlock[] = [];
  let line = 0;

  while (line < document.lineCount) {
    const header = parseTaggedScalarHeader(document.lineAt(line).text);
    if (header === undefined) {
      line += 1;
      continue;
    }

    const contentStartLine = line + 1;
    let contentIndent = header.explicitIndent;
    if (contentIndent !== undefined) contentIndent += header.contextIndent;

    if (contentIndent === undefined) {
      for (
        let candidate = contentStartLine;
        candidate < document.lineCount;
        candidate += 1
      ) {
        const text = document.lineAt(candidate).text;
        if (text.trim() === "") continue;

        const indent = leadingSpaces(text);
        contentIndent =
          indent > header.contextIndent ? indent : header.contextIndent + 1;
        break;
      }
    }
    contentIndent ??= header.contextIndent + 1;

    let endLineExclusive = contentStartLine;
    for (
      let candidate = contentStartLine;
      candidate < document.lineCount;
      candidate += 1
    ) {
      const text = document.lineAt(candidate).text;
      if (text.trim() !== "" && leadingSpaces(text) < contentIndent) break;
      endLineExclusive = candidate + 1;
    }

    blocks.push({
      headerLine: line,
      contentStartLine,
      endLineExclusive,
      contentIndent,
      language: header.language,
      tag: header.tag,
    });

    line = Math.max(line + 1, endLineExclusive);
  }

  return blocks;
}

import { findXmlRegions } from "./xml-regions";
import type { TextSpan } from "./xml-regions";
import { findTaggedYamlBlocks } from "./yaml-blocks";
import type { TextDocumentLike } from "./yaml-blocks";

export interface DecorationPlan {
  readonly codeBlocks: readonly TextSpan[];
  readonly markdownBlocks: readonly TextSpan[];
  readonly xmlTags: readonly TextSpan[];
  readonly xmlContent: readonly TextSpan[];
}

function blockLineSpans(
  document: TextDocumentLike,
  startLine: number,
  endLineExclusive: number,
  contentIndent: number,
): readonly TextSpan[] {
  const spans: TextSpan[] = [];

  for (let line = startLine; line < endLineExclusive; line += 1) {
    const text = document.lineAt(line).text;
    const startCharacter = Math.min(contentIndent, text.length);
    if (startCharacter === text.length) continue;
    spans.push({
      start: { line, character: startCharacter },
      end: { line, character: text.length },
    });
  }

  return spans;
}

export function buildDecorationPlan(
  document: TextDocumentLike,
): DecorationPlan {
  const blocks = findTaggedYamlBlocks(document);
  const codeBlocks: TextSpan[] = [];
  const markdownBlocks: TextSpan[] = [];

  for (const block of blocks) {
    const spans = blockLineSpans(
      document,
      block.contentStartLine,
      block.endLineExclusive,
      block.contentIndent,
    );
    if (block.language === "markdown") {
      markdownBlocks.push(...spans);
    } else {
      codeBlocks.push(...spans);
    }
  }

  const xml = findXmlRegions(document, blocks);
  return {
    codeBlocks,
    markdownBlocks,
    xmlTags: xml.tags.map(({ start, end }) => ({ start, end })),
    xmlContent: xml.pairs
      .map((pair) => pair.content)
      .filter(
        (span) =>
          span.start.line !== span.end.line ||
          span.start.character !== span.end.character,
      ),
  };
}

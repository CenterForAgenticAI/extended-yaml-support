import type { TextDocumentLike } from "../src/yaml-blocks";

export function textDocument(text: string): TextDocumentLike {
  const lines = text.replaceAll("\r\n", "\n").split("\n");
  return {
    lineCount: lines.length,
    lineAt(line: number): { readonly text: string } {
      const value = lines[line];
      if (value === undefined) {
        throw new RangeError(`Line ${line} is outside the document`);
      }
      return { text: value };
    },
  };
}

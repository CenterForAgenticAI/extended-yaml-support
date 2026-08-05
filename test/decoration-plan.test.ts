import { describe, expect, it } from "vitest";
import { buildDecorationPlan } from "../src/decoration-plan";
import { textDocument } from "./helpers";

describe("buildDecorationPlan", () => {
  it("projects code block bodies to exact per-line spans", () => {
    const document = textDocument(
      [
        "value: !python |",
        "  print('first')",
        "    print('nested')",
        "next: true",
      ].join("\n"),
    );

    expect(buildDecorationPlan(document).codeBlocks).toEqual([
      { start: { line: 1, character: 2 }, end: { line: 1, character: 16 } },
      { start: { line: 2, character: 2 }, end: { line: 2, character: 19 } },
    ]);
  });

  it("separates Markdown spans and exact XML regions", () => {
    const document = textDocument(
      ["value: !md |", "  <context>important</context>", "next: true"].join(
        "\n",
      ),
    );
    const plan = buildDecorationPlan(document);

    expect(plan.markdownBlocks).toEqual([
      { start: { line: 1, character: 2 }, end: { line: 1, character: 30 } },
    ]);
    expect(plan.xmlTags).toHaveLength(2);
    expect(plan.xmlContent).toEqual([
      { start: { line: 1, character: 11 }, end: { line: 1, character: 20 } },
    ]);
  });

  it("does not emit zero-length backgrounds for blank or empty blocks", () => {
    const document = textDocument(
      ["blank: !json |", "", "next: true", "empty: !toml |"].join("\n"),
    );
    const plan = buildDecorationPlan(document);
    expect(plan.codeBlocks).toEqual([]);
    expect(plan.markdownBlocks).toEqual([]);
  });
});

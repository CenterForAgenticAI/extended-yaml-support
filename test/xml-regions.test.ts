import { describe, expect, it } from "vitest";
import { findTaggedYamlBlocks } from "../src/yaml-blocks";
import { findXmlRegions } from "../src/xml-regions";
import type { XmlRegions } from "../src/xml-regions";
import { textDocument } from "./helpers";

function scan(body: readonly string[]): XmlRegions {
  const document = textDocument(
    ["value: !md |", ...body.map((line) => `  ${line}`)].join("\n"),
  );
  return findXmlRegions(document, findTaggedYamlBlocks(document));
}

describe("findXmlRegions", () => {
  it("preserves source order for repeated sibling tags", () => {
    const result = scan(["<item>one</item><item>two</item>"]);

    expect(result.tags.map(({ kind, name }) => `${kind}:${name}`)).toEqual([
      "open:item",
      "close:item",
      "open:item",
      "close:item",
    ]);
    expect(result.pairs).toHaveLength(2);
    expect(result.pairs.map((pair) => pair.content)).toEqual([
      { start: { line: 1, character: 8 }, end: { line: 1, character: 11 } },
      { start: { line: 1, character: 24 }, end: { line: 1, character: 27 } },
    ]);
  });

  it("pairs strictly nested tags", () => {
    const result = scan(["<outer>", "  <inner>value</inner>", "</outer>"]);
    expect(
      result.pairs.map(({ open, close }) => [open.name, close.name]),
    ).toEqual([
      ["inner", "inner"],
      ["outer", "outer"],
    ]);
  });

  it("does not form crossing pairs for malformed nesting", () => {
    const result = scan(["<a><b>text</a></b>"]);
    expect(result.pairs.map(({ open }) => open.name)).toEqual(["b"]);
  });

  it("supports namespaced names and quoted tag delimiters", () => {
    const result = scan([
      "<agent:step data='a>b'>one</agent:step>",
      '<tool.call data="a>b">two</tool.call>',
    ]);
    expect(result.tags.map((tag) => tag.name)).toEqual([
      "agent:step",
      "agent:step",
      "tool.call",
      "tool.call",
    ]);
    expect(result.pairs).toHaveLength(2);
  });

  it("recognizes self-closing tags without pairing them", () => {
    const result = scan(['before <widget name="a>b" /> after']);
    expect(result.tags).toMatchObject([
      { kind: "self-closing", name: "widget" },
    ]);
    expect(result.pairs).toEqual([]);
  });

  it("returns an exact multiline content span", () => {
    const result = scan(["<context>first", "second", "third</context>"]);
    expect(result.pairs[0]?.content).toEqual({
      start: { line: 1, character: 11 },
      end: { line: 3, character: 7 },
    });
  });

  it("ignores same-line and multiline XML comments", () => {
    const result = scan([
      "<!-- <same>ignored</same> --> <kept>one</kept>",
      "<!-- <multi>",
      "ignored</multi> --> <also-kept>two</also-kept>",
    ]);
    expect(result.tags.map((tag) => tag.name)).toEqual([
      "kept",
      "kept",
      "also-kept",
      "also-kept",
    ]);
  });

  it("ignores tags inside inline code and fenced code", () => {
    const result = scan([
      "`<inline>ignored</inline>` <kept>yes</kept>",
      "``<double>ignored</double>`` and `<unclosed>",
      "```xml",
      "<fenced>ignored</fenced>",
      "`` not a close",
      "```",
      "~~~xml",
      "<tilde>ignored</tilde>",
      "~~~",
    ]);
    expect(result.tags.map((tag) => tag.name)).toEqual([
      "kept",
      "kept",
      "unclosed",
    ]);
  });

  it("skips malformed XML-like candidates and continues scanning", () => {
    const result = scan([
      "<> <1bad> <bad-name!> <unterminated <kept>yes</kept>",
    ]);
    expect(result.tags.map((tag) => tag.name)).toEqual(["kept", "kept"]);
  });

  it("does not pair tags across separate Markdown blocks", () => {
    const document = textDocument(
      ["first: !md |", "  <boundary>", "second: !md |", "  </boundary>"].join(
        "\n",
      ),
    );
    const result = findXmlRegions(document, findTaggedYamlBlocks(document));
    expect(result.tags).toHaveLength(2);
    expect(result.pairs).toEqual([]);
  });

  it("ignores XML-like text in non-Markdown blocks", () => {
    const document = textDocument("value: !python |\n  print('<tag>')");
    expect(findXmlRegions(document, findTaggedYamlBlocks(document))).toEqual({
      tags: [],
      pairs: [],
    });
  });
});

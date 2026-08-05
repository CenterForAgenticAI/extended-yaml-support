import { describe, expect, it } from "vitest";
import { LANGUAGE_DEFINITIONS } from "../src/languages";
import { findTaggedYamlBlocks } from "../src/yaml-blocks";
import { textDocument } from "./helpers";

describe("findTaggedYamlBlocks", () => {
  it("recognizes every supported tag alias", () => {
    const yaml = LANGUAGE_DEFINITIONS.flatMap((definition, index) => {
      const tag = definition.tags[0];
      return [`block${index}: !${tag} |`, `  content-${index}`];
    }).join("\n");

    const blocks = findTaggedYamlBlocks(textDocument(yaml));

    expect(blocks.map(({ language, tag }) => ({ language, tag }))).toEqual(
      LANGUAGE_DEFINITIONS.map((definition) => ({
        language: definition.id,
        tag: definition.tags[0],
      })),
    );
  });

  it.each(["|", ">", "|-", "|+", "|2", "|2-", "|-2", ">2+", ">+2"])(
    "accepts the valid scalar header %s",
    (header) => {
      const blocks = findTaggedYamlBlocks(
        textDocument(`value: !md ${header}\n  body`),
      );
      expect(blocks).toHaveLength(1);
      expect(blocks[0]).toMatchObject({
        contentIndent: 2,
        endLineExclusive: 2,
      });
    },
  );

  it("ignores comment markers inside quoted keys and anchors", () => {
    const document = textDocument(
      [
        '"double # key": !md | # real comment',
        "  markdown",
        "'single '' # key': !python |",
        "  print('ok')",
      ].join("\n"),
    );

    expect(
      findTaggedYamlBlocks(document).map((block) => block.language),
    ).toEqual(["markdown", "python"]);
  });

  it("handles escaped quotes while locating an unquoted tag", () => {
    const document = textDocument(
      String.raw`"escaped \" # key": !json |
  {"ok": true}`,
    );
    expect(findTaggedYamlBlocks(document)[0]).toMatchObject({
      language: "json",
    });
  });

  it("supports anchors and trailing comments", () => {
    const document = textDocument(
      [
        "first: &shared !python | # explanation",
        "  print('ok')",
        "second: !md &copy >- # note",
        "  text",
      ].join("\n"),
    );

    expect(
      findTaggedYamlBlocks(document).map((block) => block.language),
    ).toEqual(["python", "markdown"]);
  });

  it("ends a nested sequence mapping block at its sibling", () => {
    const document = textDocument(
      [
        "items:",
        "  - prompt: !md |",
        "      # Heading",
        "      body",
        "    next: value",
        "  - prompt: plain",
      ].join("\n"),
    );

    expect(findTaggedYamlBlocks(document)).toEqual([
      {
        headerLine: 1,
        contentStartLine: 2,
        endLineExclusive: 4,
        contentIndent: 6,
        language: "markdown",
        tag: "md",
      },
    ]);
  });

  it("keeps leading blank lines and stops at a content-indent dedent", () => {
    const document = textDocument(
      [
        "value: !python |",
        "",
        "    first",
        "      nested",
        "  sibling",
        "after: value",
      ].join("\n"),
    );

    expect(findTaggedYamlBlocks(document)[0]).toMatchObject({
      contentStartLine: 1,
      contentIndent: 4,
      endLineExclusive: 4,
    });
  });

  it("uses an explicit indentation indicator even when content begins with blank lines", () => {
    const document = textDocument(
      ["value: !python |2-", "", "  first", "next: value"].join("\n"),
    );

    expect(findTaggedYamlBlocks(document)[0]).toMatchObject({
      contentIndent: 2,
      endLineExclusive: 3,
    });
  });

  it("handles a scalar at end of file", () => {
    const blocks = findTaggedYamlBlocks(
      textDocument("value: !toml |\n  key = true"),
    );
    expect(blocks[0]).toMatchObject({ endLineExclusive: 2, language: "toml" });
  });

  it("records an empty tagged scalar without consuming its sibling", () => {
    const blocks = findTaggedYamlBlocks(
      textDocument("value: !json |\nnext: value"),
    );
    expect(blocks[0]).toMatchObject({
      contentStartLine: 1,
      endLineExclusive: 1,
      contentIndent: 1,
    });
  });

  it.each([
    "# value: !md |\n  not markdown",
    'value: "!md |"\nnext: value',
    "value: plain !md text\nnext: value",
    "value: prefix!md |\n  text",
    "value: !md|\n  text",
    "value: !1 |\n  text",
    "\tvalue: !md |\n\ttext",
    "value: !unknown |\n  text",
    "value: !MD |\n  text",
    "value: !md ||\n  text",
    "value: !md |22\n  text",
  ])("ignores unsupported or non-header text", (yaml) => {
    expect(findTaggedYamlBlocks(textDocument(yaml))).toEqual([]);
  });

  it("handles compact sequence and explicit mapping prefixes", () => {
    const document = textDocument(
      [
        "- - value: !ruby |",
        "      puts 'ok'",
        "? key: !shell |",
        "    echo ok",
        "-invalid: !toml |",
        "  key = true",
      ].join("\n"),
    );
    expect(
      findTaggedYamlBlocks(document).map((block) => block.contentIndent),
    ).toEqual([6, 4, 2]);
  });

  it("normalizes CRLF line endings through the document boundary", () => {
    const blocks = findTaggedYamlBlocks(
      textDocument("value: !shell |\r\n  echo ok\r\nnext: true"),
    );
    expect(blocks[0]).toMatchObject({
      endLineExclusive: 2,
      language: "shellscript",
    });
  });

  it("scans a representative one-megabyte document within a bounded budget", () => {
    const entry = [
      "prompt: !md |",
      "  <context>Review the following material carefully.</context>",
      "metadata: ordinary-value",
    ].join("\n");
    const yaml = Array.from({ length: 10_000 }, () => entry).join("\n");
    expect(Buffer.byteLength(yaml)).toBeGreaterThan(1_000_000);

    const start = performance.now();
    const blocks = findTaggedYamlBlocks(textDocument(yaml));
    const elapsed = performance.now() - start;

    expect(blocks).toHaveLength(10_000);
    expect(elapsed).toBeLessThan(1000);
  });
});

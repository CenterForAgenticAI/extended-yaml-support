import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { beforeAll, describe, expect, it } from "vitest";
import { OnigScanner, OnigString, loadWASM } from "vscode-oniguruma";
import { INITIAL, Registry } from "vscode-textmate";
import type { IGrammar, IRawGrammar, StateStack } from "vscode-textmate";
import { buildGrammar } from "../scripts/generate-grammar";
import { LANGUAGE_DEFINITIONS } from "../src/languages";

const require = createRequire(import.meta.url);

beforeAll(async () => {
  const wasm = await readFile(
    require.resolve("vscode-oniguruma/release/onig.wasm"),
  );
  await loadWASM(wasm);
});

async function yamlGrammar(): Promise<IGrammar> {
  const rawGrammars = new Map<string, IRawGrammar>();
  rawGrammars.set("source.yaml", {
    scopeName: "source.yaml",
    patterns: [
      { match: "#.*$", name: "comment.line.number-sign.yaml" },
      { begin: '"', end: '"', name: "string.quoted.double.yaml" },
      { begin: "'", end: "'", name: "string.quoted.single.yaml" },
    ],
  } as unknown as IRawGrammar);
  rawGrammars.set(
    "source.yaml.extended.injection",
    buildGrammar() as unknown as IRawGrammar,
  );
  for (const definition of LANGUAGE_DEFINITIONS) {
    rawGrammars.set(definition.textMateScope, {
      scopeName: definition.textMateScope,
      patterns: [{ match: "[^\\s]+", name: `support.test.${definition.id}` }],
    } as unknown as IRawGrammar);
  }

  const registry = new Registry({
    onigLib: Promise.resolve({
      createOnigScanner(patterns: string[]): OnigScanner {
        return new OnigScanner(patterns);
      },
      createOnigString(value: string): OnigString {
        return new OnigString(value);
      },
    }),
    loadGrammar(scopeName: string): Promise<IRawGrammar | undefined> {
      return Promise.resolve(rawGrammars.get(scopeName));
    },
    getInjections(scopeName: string): string[] | undefined {
      return scopeName === "source.yaml"
        ? ["source.yaml.extended.injection"]
        : undefined;
    },
  });
  const grammar = await registry.loadGrammar("source.yaml");
  if (grammar === null) throw new Error("Failed to load test YAML grammar");
  return grammar;
}

function tokenize(
  grammar: IGrammar,
  lines: readonly string[],
): readonly (readonly string[])[] {
  let ruleStack: StateStack = INITIAL;
  return lines.map((line) => {
    const result = grammar.tokenizeLine(line, ruleStack);
    ruleStack = result.ruleStack;
    return result.tokens.flatMap((token) => token.scopes);
  });
}

describe("TextMate injection grammar", () => {
  it("enters the expected embedded scope for every language", async () => {
    const grammar = await yamlGrammar();

    for (const definition of LANGUAGE_DEFINITIONS) {
      const tag = definition.tags[0];
      const scopes = tokenize(grammar, [`value: !${tag} |`, "  sample"]);
      expect(
        scopes[1],
        `missing ${definition.embeddedScope} for !${tag}`,
      ).toContain(definition.embeddedScope);
      expect(scopes[1]).toContain(`support.test.${definition.id}`);
    }
  });

  it("ends an embedded scope before a top-level sibling", async () => {
    const grammar = await yamlGrammar();
    const scopes = tokenize(grammar, [
      "value: !python |",
      "  print('ok')",
      "next: plain",
    ]);
    expect(scopes[1]).toContain("meta.embedded.inline.python");
    expect(scopes[2]).not.toContain("meta.embedded.inline.python");
  });

  it("ends an embedded scope before a nested sequence mapping sibling", async () => {
    const grammar = await yamlGrammar();
    const scopes = tokenize(grammar, [
      "items:",
      "  - prompt: !md |",
      "      body",
      "    next: plain",
      "      ordinary nested value",
    ]);
    expect(scopes[2]).toContain("meta.embedded.inline.markdown");
    expect(scopes[3]).not.toContain("meta.embedded.inline.markdown");
    expect(scopes[4]).not.toContain("meta.embedded.inline.markdown");
  });

  it("does not activate for tags in comments, quoted strings, or unsupported tags", async () => {
    const grammar = await yamlGrammar();
    const lines = [
      "# value: !python |",
      'value: "!python |"',
      "value: !unknown |",
      "  sample",
    ];
    const scopes = tokenize(grammar, lines);
    expect(scopes.flat()).not.toContain("meta.embedded.inline.python");
  });

  it("adds XML tag scopes only within embedded Markdown", async () => {
    const grammar = await yamlGrammar();
    const scopes = tokenize(grammar, [
      "value: !md |",
      "  <system-reminder>text</system-reminder>",
      "next: plain",
    ]);
    expect(scopes[1]).toContain("entity.name.tag.custom.xml");
    expect(scopes[2]).not.toContain("entity.name.tag.custom.xml");
  });
});

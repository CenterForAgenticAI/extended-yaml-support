import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import manifest from "../package.json";
import { buildGrammar } from "../scripts/generate-grammar";
import { LANGUAGE_DEFINITIONS } from "../src/languages";

describe("generated grammar", () => {
  it("has one deterministic injection pattern per language", () => {
    const grammar = buildGrammar();
    expect(grammar.scopeName).toBe("source.yaml.extended.injection");
    expect(grammar.patterns).toHaveLength(LANGUAGE_DEFINITIONS.length);

    for (const [index, definition] of LANGUAGE_DEFINITIONS.entries()) {
      const pattern = grammar.patterns[index];
      expect(pattern?.begin).toContain(definition.tags.join("|"));
      expect(pattern?.patterns?.[0]?.name).toBe(definition.embeddedScope);
    }
  });

  it("keeps the checked-in grammar synchronized with the generator", async () => {
    const generated = `${JSON.stringify(buildGrammar(), undefined, 2)}\n`;
    const checkedIn = await readFile(
      "syntaxes/extended-yaml-injection.json",
      "utf8",
    );
    expect(checkedIn).toBe(generated);
  });

  it("keeps manifest embedded-language mappings synchronized", () => {
    const grammarContribution = manifest.contributes.grammars[0];
    if (grammarContribution === undefined)
      throw new Error("Missing grammar contribution");
    const expected = Object.fromEntries(
      LANGUAGE_DEFINITIONS.map((definition) => [
        definition.embeddedScope,
        definition.id,
      ]),
    );
    expect(grammarContribution.embeddedLanguages).toEqual(expected);
  });

  it("scopes XML-like tags only inside embedded Markdown", () => {
    const grammar = buildGrammar();
    const serializedMarkdown = JSON.stringify(grammar.patterns[0]);
    const serializedOthers = JSON.stringify(grammar.patterns.slice(1));
    expect(serializedMarkdown).toContain("entity.name.tag.custom.xml");
    expect(serializedOthers).not.toContain("entity.name.tag.custom.xml");
    expect(manifest.contributes.grammars).toHaveLength(1);
  });
});

import { describe, expect, it } from "vitest";
import { LANGUAGE_BY_TAG, LANGUAGE_DEFINITIONS } from "../src/languages";

describe("language registry", () => {
  it("contains unique tag aliases and embedded scopes", () => {
    const tags = LANGUAGE_DEFINITIONS.flatMap((definition) => definition.tags);
    const scopes = LANGUAGE_DEFINITIONS.map(
      (definition) => definition.embeddedScope,
    );
    expect(new Set(tags).size).toBe(tags.length);
    expect(new Set(scopes).size).toBe(scopes.length);
    expect(LANGUAGE_BY_TAG.size).toBe(tags.length);
  });

  it("maps each alias to its canonical language", () => {
    for (const definition of LANGUAGE_DEFINITIONS) {
      for (const tag of definition.tags) {
        expect(LANGUAGE_BY_TAG.get(tag)?.id).toBe(definition.id);
      }
    }
  });
});

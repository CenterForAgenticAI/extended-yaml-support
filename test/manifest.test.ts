import { describe, expect, it } from "vitest";
import manifest from "../package.json";

describe("extension manifest", () => {
  it("contains public Marketplace metadata", () => {
    expect(manifest).toMatchObject({
      name: "extended-yaml-support",
      displayName: "Extended YAML Support",
      publisher: "CenterForAgenticAI",
      license: "MIT",
      icon: "images/icon.png",
      pricing: "Free",
    });
    expect(manifest.repository.url).toBe(
      "https://github.com/CenterForAgenticAI/extended-yaml-support.git",
    );
    expect(manifest.main).toBe("./dist/extension.cjs");
  });

  it("uses an explicit runtime payload allowlist", () => {
    expect(manifest.files).toEqual([
      "dist/**",
      "syntaxes/**",
      "images/icon.png",
      "README.md",
      "CHANGELOG.md",
      "LICENSE",
      "SUPPORT.md",
    ]);
  });

  it("does not modify global editor token colors", () => {
    expect(manifest.contributes).not.toHaveProperty("configurationDefaults");
  });
});

export interface LanguageDefinition {
  readonly id:
    | "markdown"
    | "python"
    | "json"
    | "typescript"
    | "rust"
    | "shellscript"
    | "ruby"
    | "diff"
    | "toml";
  readonly tags: readonly string[];
  readonly textMateScope: string;
  readonly embeddedScope: `meta.embedded.inline.${string}`;
}

export const LANGUAGE_DEFINITIONS = [
  {
    id: "markdown",
    tags: ["md", "markdown"],
    textMateScope: "text.html.markdown",
    embeddedScope: "meta.embedded.inline.markdown",
  },
  {
    id: "python",
    tags: ["py", "python"],
    textMateScope: "source.python",
    embeddedScope: "meta.embedded.inline.python",
  },
  {
    id: "json",
    tags: ["json"],
    textMateScope: "source.json",
    embeddedScope: "meta.embedded.inline.json",
  },
  {
    id: "typescript",
    tags: ["ts", "typescript"],
    textMateScope: "source.ts",
    embeddedScope: "meta.embedded.inline.typescript",
  },
  {
    id: "rust",
    tags: ["rs", "rust"],
    textMateScope: "source.rust",
    embeddedScope: "meta.embedded.inline.rust",
  },
  {
    id: "shellscript",
    tags: ["bash", "sh", "shell"],
    textMateScope: "source.shell",
    embeddedScope: "meta.embedded.inline.shell",
  },
  {
    id: "ruby",
    tags: ["rb", "ruby"],
    textMateScope: "source.ruby",
    embeddedScope: "meta.embedded.inline.ruby",
  },
  {
    id: "diff",
    tags: ["diff", "patch"],
    textMateScope: "source.diff",
    embeddedScope: "meta.embedded.inline.diff",
  },
  {
    id: "toml",
    tags: ["toml"],
    textMateScope: "source.toml",
    embeddedScope: "meta.embedded.inline.toml",
  },
] as const satisfies readonly LanguageDefinition[];

export type EmbeddedLanguageId = (typeof LANGUAGE_DEFINITIONS)[number]["id"];

export const LANGUAGE_BY_TAG: ReadonlyMap<string, LanguageDefinition> = new Map(
  LANGUAGE_DEFINITIONS.flatMap((definition) =>
    definition.tags.map((tag) => [tag, definition] as const),
  ),
);

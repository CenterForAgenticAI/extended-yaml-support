import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { LANGUAGE_DEFINITIONS } from "../src/languages";

interface GrammarPattern {
  readonly begin?: string;
  readonly beginCaptures?: Readonly<Record<string, { readonly name: string }>>;
  readonly end?: string;
  readonly include?: string;
  readonly match?: string;
  readonly name?: string;
  readonly patterns?: readonly GrammarPattern[];
}

interface InjectionGrammar {
  readonly scopeName: string;
  readonly injectionSelector: string;
  readonly patterns: readonly GrammarPattern[];
}

const XML_PATTERNS: readonly GrammarPattern[] = [
  {
    name: "meta.tag.custom.xml",
    begin: "(<)([a-zA-Z][\\w:.-]*)(?=\\s|>|/>)",
    beginCaptures: {
      "1": { name: "punctuation.definition.tag.begin.xml" },
      "2": { name: "entity.name.tag.custom.xml" },
    },
    end: "(/>)|(?:(>))",
    patterns: [
      {
        name: "entity.other.attribute-name.xml",
        match: "\\b([a-zA-Z][\\w:.-]*)(?=\\s*=)",
      },
      { name: "string.quoted.double.xml", begin: '"', end: '"' },
      { name: "string.quoted.single.xml", begin: "'", end: "'" },
    ],
  },
  {
    name: "meta.tag.custom.end.xml",
    match: "(</)([a-zA-Z][\\w:.-]*)(>)",
  },
];

function embeddedPatterns(
  definition: (typeof LANGUAGE_DEFINITIONS)[number],
): readonly GrammarPattern[] {
  if (definition.id === "markdown") {
    return [...XML_PATTERNS, { include: definition.textMateScope }];
  }

  if (definition.id === "diff") {
    return [
      {
        match: "(?:^|\\G)\\s*(?:\\*\\*\\*|---|\\+\\+\\+).*$",
        name: "meta.diff.header",
      },
      { match: "(?:^|\\G)\\s*@@.*$", name: "meta.diff.range" },
      { match: "(?:^|\\G)\\s*\\+.*$", name: "markup.inserted.diff" },
      { match: "(?:^|\\G)\\s*-.*$", name: "markup.deleted.diff" },
      { include: definition.textMateScope },
    ];
  }

  return [{ include: definition.textMateScope }];
}

export function buildGrammar(): InjectionGrammar {
  return {
    scopeName: "source.yaml.extended.injection",
    injectionSelector:
      "L:source.yaml -comment -string, L:source.yaml.1.0 -comment -string, L:source.yaml.1.1 -comment -string, L:source.yaml.1.2 -comment -string, L:source.yaml.1.3 -comment -string, L:text.yaml -comment -string, L:text.yaml.jinja -comment -string",
    patterns: LANGUAGE_DEFINITIONS.map((definition) => ({
      begin: `!(${definition.tags.join("|")})\\s+(?:&[^\\s]+\\s+)?(?:(\\|)|(>))(?:[1-9][-+]?|[-+][1-9]?)?\\s*(?:#.*)?$`,
      beginCaptures: {
        "1": { name: "storage.type.tag.extended.yaml" },
        "2": { name: "keyword.control.flow.block-scalar.literal.yaml" },
        "3": { name: "keyword.control.flow.block-scalar.folded.yaml" },
      },
      end: "^(?=\\S)|(?!\\G)",
      patterns: [
        {
          begin: "(?>^|\\G)([ ]+)(?! )",
          end: "^(?!\\1|\\s*$)",
          name: definition.embeddedScope,
          patterns: embeddedPatterns(definition),
        },
      ],
    })),
  };
}

async function main(): Promise<void> {
  const repositoryRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
  );
  const outputPath = path.join(
    repositoryRoot,
    "syntaxes",
    "extended-yaml-injection.json",
  );
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(
    outputPath,
    `${JSON.stringify(buildGrammar(), undefined, 2)}\n`,
    "utf8",
  );
}

const invokedPath = process.argv[1];
if (
  invokedPath !== undefined &&
  import.meta.url === pathToFileURL(path.resolve(invokedPath)).href
) {
  await main();
}

# Extended YAML Support

Extended YAML Support adds embedded-language highlighting and optional visual boundaries to tagged YAML block scalars in Visual Studio Code.

Use an explicit tag such as `!python` or `!md` before a literal (`|`) or folded (`>`) block. The block keeps normal YAML structure while its contents are highlighted as the selected language.

## Features

- Embedded syntax highlighting for Markdown, Python, JSON, TypeScript, Rust, shell scripts, Ruby, diffs, and TOML
- Literal and folded YAML block scalars, including indentation and chomping indicators
- Configurable background decorations for embedded blocks
- XML-style tag highlighting and content boundaries inside embedded Markdown
- No telemetry, network requests, external commands, or file writes
- Supports untrusted and virtual workspaces

## Examples

```yaml
prompt: !md |
  # Review instructions

  <system-reminder priority="high">
  Check every assumption before editing.
  </system-reminder>

script: !python |-
  from pathlib import Path

  print(Path.cwd())

config: !json >
  {"enabled": true, "retries": 3}

implementation: !typescript |
  const enabled: boolean = true;

query: !shell |
  printf '%s\n' "ready"
```

## Supported tags

| Embedded language | Tags                     |
| ----------------- | ------------------------ |
| Markdown          | `!md`, `!markdown`       |
| Python            | `!py`, `!python`         |
| JSON              | `!json`                  |
| TypeScript        | `!ts`, `!typescript`     |
| Rust              | `!rs`, `!rust`           |
| Shell             | `!bash`, `!sh`, `!shell` |
| Ruby              | `!rb`, `!ruby`           |
| Diff              | `!diff`, `!patch`        |
| TOML              | `!toml`                  |

Tags are case-sensitive. The tag must be attached to a YAML block scalar.

## Installation

Install **Extended YAML Support** from the Visual Studio Code Extensions view, or run:

```console
code --install-extension CenterForAgenticAI.extended-yaml-support
```

## Settings

| Setting                                            | Default                     | Purpose                                                           |
| -------------------------------------------------- | --------------------------- | ----------------------------------------------------------------- |
| `extendedYaml.decorations.enabled`                 | `true`                      | Enables editor decorations without affecting syntax highlighting. |
| `extendedYaml.decorations.codeBlockBackground`     | `rgba(0, 0, 0, 0.15)`       | Background for embedded code.                                     |
| `extendedYaml.decorations.markdownBlockBackground` | `rgba(30, 60, 90, 0.15)`    | Background for embedded Markdown.                                 |
| `extendedYaml.decorations.xmlTagColor`             | `#e06c75`                   | Foreground for XML-style tags in Markdown blocks.                 |
| `extendedYaml.decorations.xmlContentBackground`    | `rgba(224, 108, 117, 0.08)` | Background for paired XML-style tag contents.                     |
| `extendedYaml.decorations.debounceMilliseconds`    | `75`                        | Delay before decorations are refreshed after an edit.             |

Set `extendedYaml.decorations.enabled` to `false` if you want embedded syntax highlighting without backgrounds.

## YAML validation

This extension adds editor presentation only; it does not replace a YAML parser or validator. If your YAML validation extension reports the custom tags as unknown, configure that validator to recognize the tags as scalar tags.

For the Red Hat YAML extension, the equivalent setting begins like this:

```json
{
  "yaml.customTags": [
    "!md scalar",
    "!markdown scalar",
    "!py scalar",
    "!python scalar",
    "!json scalar",
    "!ts scalar",
    "!typescript scalar"
  ]
}
```

Add the remaining tags you use from the table above.

## Development

Requirements: Node.js 22.13 or later in the Node 22 line, or Node.js 24 or later, with npm.

```console
npm install
npm run check
```

`npm run check` verifies formatting, lint rules, types, tests, the production bundle, and the installable extension package.

To run an Extension Development Host in VS Code, open this repository and press <kbd>F5</kbd>.

## Support and security

- Use [GitHub Issues](https://github.com/CenterForAgenticAI/extended-yaml-support/issues) for bugs and feature requests.
- See [SUPPORT.md](SUPPORT.md) for diagnostic information to include.
- See [SECURITY.md](SECURITY.md) for private vulnerability reporting guidance.

## License

[MIT](LICENSE)

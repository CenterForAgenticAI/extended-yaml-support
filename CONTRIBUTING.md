# Contributing

Thank you for helping improve Extended YAML Support.

## Development setup

Use Node.js 22 or later.

```console
npm install
npm run check
npm run test:package
```

`npm run test:package` installs the verified VSIX from `artifacts/` in an isolated VS Code test profile.

## Pull requests

- Keep behavior changes focused and describe the user-visible outcome.
- Add or update tests before changing parser or grammar behavior.
- Add a changelog entry for user-visible changes.
- Run `npm run check` from a clean checkout.
- Do not add telemetry, network access, command execution, or workspace writes without prior discussion and explicit documentation.

The tag registry in `src/languages.ts` is the single source used to generate the syntax grammar. Run `npm run generate:grammar` after registry changes.

## Releases

Maintainers should follow [RELEASING.md](RELEASING.md). Do not create a release tag until Marketplace access and the release credential have been verified.

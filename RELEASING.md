# Releasing

Releases publish the same verified VSIX file to both the GitHub release and the Visual Studio Marketplace. An npm account is not required.

## Prerequisites

Before creating a release or tag:

1. Confirm the Marketplace publisher ID is `CenterForAgenticAI` and that you can manage it.
2. Create an Azure DevOps personal access token for **All accessible organizations** with only **Marketplace: Manage** access. Use the shortest practical expiration.
3. Store the token as the `VSCE_PAT` secret in the `visual-studio-marketplace` GitHub environment. Never store it in a file, command history, issue, or workflow.
4. Verify publisher access locally with `npx vsce login CenterForAgenticAI`.
5. From the repository's **Actions** tab, run **Publish release** on `main`. Confirm that **Verify release candidate** succeeds. A manual readiness run never creates a tag or publishes.
6. Confirm the `main` branch CI run is green.

Microsoft [plans to retire global personal access tokens on December 1, 2026](https://learn.microsoft.com/en-us/azure/devops/release-notes/2026/general/sprint-270-update). Replace this credential with Microsoft Entra ID short-lived authentication when the stable Marketplace tooling supports the chosen GitHub Actions setup.

## Prepare a release

1. Update `version` in `package.json` and `package-lock.json`.
2. Update `CHANGELOG.md`.
3. Run:

   ```console
   npm ci
   npm audit --audit-level=high
   npm audit signatures
   npm run check
   npm run test:package
   ```

4. Merge the change to `main` and wait for every required CI check.
5. Confirm the package version is not already published.

## Publish

Create a GitHub release whose tag is exactly `v<package.json version>`, for example `v0.1.0`.

The release workflow then:

- verifies the tag version and confirms the tagged commit is on `main`;
- audits dependencies and reruns all quality checks;
- installs and tests the packaged VSIX in a clean VS Code extension host;
- attaches that exact VSIX to the GitHub release; and
- publishes that exact VSIX to the Visual Studio Marketplace.

Do not upload a replacement VSIX manually after the workflow succeeds. If publishing fails, fix the cause without changing the existing version's package contents.

## Credential maintenance

Rotate `VSCE_PAT` before it expires. Remove superseded tokens from Azure DevOps immediately. Environment secrets are visible to the release job only; do not move the token to a repository-level variable or plaintext setting.

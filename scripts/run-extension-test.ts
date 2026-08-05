import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runTests, runVSCodeCommand } from "@vscode/test-electron";

const repositoryRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const version = process.env.VSCODE_VERSION ?? "stable";
const packagedExtensionArgument = process.argv[2];

try {
  let extensionDevelopmentPath = repositoryRoot;
  let extensionTestsEnv: Record<string, string> | undefined;
  const launchArgs = [
    path.join(repositoryRoot, "test", "fixtures", "workspace"),
    "--disable-updates",
    "--skip-welcome",
    "--skip-release-notes",
  ];

  if (packagedExtensionArgument === undefined) {
    launchArgs.push("--disable-extensions");
  } else {
    const packagedExtension = path.resolve(packagedExtensionArgument);
    const extensionsDirectory = path.join(
      repositoryRoot,
      ".vscode-test",
      `packaged-extensions-${version.replaceAll(/[^A-Za-z0-9.-]/g, "-")}`,
    );
    await rm(extensionsDirectory, { force: true, recursive: true });
    await mkdir(extensionsDirectory, { recursive: true });
    await runVSCodeCommand(
      [
        "--install-extension",
        packagedExtension,
        "--force",
        `--extensions-dir=${extensionsDirectory}`,
      ],
      { version },
    );

    extensionDevelopmentPath = path.join(repositoryRoot, "test", "harness");
    extensionTestsEnv = { EXPECTED_EXTENSION_ROOT: extensionsDirectory };
    launchArgs.push(`--extensions-dir=${extensionsDirectory}`);
  }

  await runTests({
    version,
    extensionDevelopmentPath,
    extensionTestsPath: path.join(
      repositoryRoot,
      "dist",
      "test",
      "integration.cjs",
    ),
    ...(extensionTestsEnv === undefined ? {} : { extensionTestsEnv }),
    launchArgs,
  });
} catch (error: unknown) {
  const mode =
    packagedExtensionArgument === undefined
      ? "development extension"
      : "packaged VSIX";
  console.error(
    `Extension-host smoke test failed for ${mode} on VS Code ${version}`,
  );
  console.error(error);
  process.exitCode = 1;
}

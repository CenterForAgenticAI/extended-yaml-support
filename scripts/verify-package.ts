import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { strFromU8, unzipSync } from "fflate";

interface ExtensionIdentity {
  readonly name: string;
  readonly publisher: string;
  readonly version: string;
}

const packagePathArgument = process.argv[2];
if (packagePathArgument === undefined) {
  throw new Error("Usage: tsx scripts/verify-package.ts <extension.vsix>");
}
const packagePath: string = packagePathArgument;

const allowedEntries = new Set([
  "[Content_Types].xml",
  "extension.vsixmanifest",
  "extension/LICENSE.txt",
  "extension/SUPPORT.md",
  "extension/changelog.md",
  "extension/dist/extension.cjs",
  "extension/dist/extension.cjs.map",
  "extension/images/icon.png",
  "extension/package.json",
  "extension/readme.md",
  "extension/syntaxes/extended-yaml-injection.json",
]);

function extensionIdentity(json: string): ExtensionIdentity {
  const parsed: unknown = JSON.parse(json);
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("name" in parsed) ||
    typeof parsed.name !== "string" ||
    !("publisher" in parsed) ||
    typeof parsed.publisher !== "string" ||
    !("version" in parsed) ||
    typeof parsed.version !== "string"
  ) {
    throw new Error(
      "Extension manifest does not contain a string name, publisher, and version",
    );
  }
  return {
    name: parsed.name,
    publisher: parsed.publisher,
    version: parsed.version,
  };
}

const vsix = await readFile(packagePath);
const archive = unzipSync(vsix);
const entries = Object.keys(archive).sort();

function archiveEntry(entry: string): Uint8Array {
  const value = archive[entry];
  if (value === undefined) throw new Error(`Missing package entry ${entry}`);
  return value;
}

function archiveText(entry: string): string {
  return strFromU8(archiveEntry(entry));
}

const unexpected = entries.filter((entry) => !allowedEntries.has(entry));
const missing = [...allowedEntries].filter((entry) => !entries.includes(entry));
if (unexpected.length > 0 || missing.length > 0) {
  throw new Error(
    `Unexpected package payload. Unexpected: ${unexpected.join(", ") || "none"}. Missing: ${missing.join(", ") || "none"}.`,
  );
}

const publicTextEntries = entries.filter((entry) => !entry.endsWith(".png"));
const localPathPattern =
  /\/Users\/|\/home\/[A-Za-z0-9._-]+\/|[A-Za-z]:\\Users\\/i;
const localPaths = [process.cwd(), process.env.HOME]
  .filter((value): value is string => value !== undefined && value.length > 1)
  .flatMap((value) => [value, value.replaceAll("\\", "/")]);
for (const entry of publicTextEntries) {
  const text = archiveText(entry);
  if (
    localPathPattern.test(text) ||
    localPaths.some((localPath) => text.includes(localPath))
  ) {
    throw new Error(`Local filesystem path in ${entry}`);
  }
}

const rootManifest = extensionIdentity(await readFile("package.json", "utf8"));
const packagedManifest = extensionIdentity(
  archiveText("extension/package.json"),
);
if (
  packagedManifest.name !== rootManifest.name ||
  packagedManifest.publisher !== rootManifest.publisher ||
  packagedManifest.version !== rootManifest.version
) {
  throw new Error("Packaged extension identity does not match package.json");
}

const icon = Buffer.from(archiveEntry("extension/images/icon.png"));
const pngSignature = "89504e470d0a1a0a";
if (icon.subarray(0, 8).toString("hex") !== pngSignature) {
  throw new Error("Marketplace icon is not a PNG");
}
const width = icon.readUInt32BE(16);
const height = icon.readUInt32BE(20);
if (width < 128 || height < 128) {
  throw new Error(`Marketplace icon is too small: ${width}x${height}`);
}

const checksum = createHash("sha256").update(vsix).digest("hex");
console.log(
  `Verified ${entries.length} files in ${path.basename(packagePath)} (${width}x${height} icon, sha256 ${checksum})`,
);

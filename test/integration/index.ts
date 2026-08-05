import assert from "node:assert/strict";
import path from "node:path";
import * as vscode from "vscode";

const EXTENSION_ID = "CenterForAgenticAI.extended-yaml-support";

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function run(): Promise<void> {
  const extension = vscode.extensions.getExtension(EXTENSION_ID);
  assert.ok(extension, `Extension ${EXTENSION_ID} was not discovered`);

  const expectedExtensionRoot = process.env.EXPECTED_EXTENSION_ROOT;
  if (expectedExtensionRoot !== undefined) {
    const relativeExtensionPath = path.relative(
      expectedExtensionRoot,
      extension.extensionPath,
    );
    assert.equal(
      path.isAbsolute(relativeExtensionPath) ||
        relativeExtensionPath === ".." ||
        relativeExtensionPath.startsWith(`..${path.sep}`),
      false,
      `Extension was not loaded from the packaged installation: ${extension.extensionPath}`,
    );
  }

  await extension.activate();
  assert.equal(extension.isActive, true, "Extension did not activate");

  const document = await vscode.workspace.openTextDocument({
    language: "yaml",
    content: [
      "prompt: !md |",
      "  <system-reminder>Check the result.</system-reminder>",
      "script: !python |",
      "  print('ready')",
    ].join("\n"),
  });
  const editor = await vscode.window.showTextDocument(document);
  assert.equal(editor.document.languageId, "yaml");

  const edit = new vscode.WorkspaceEdit();
  const lastLine = document.lineAt(document.lineCount - 1);
  edit.insert(
    document.uri,
    new vscode.Position(lastLine.lineNumber, lastLine.text.length),
    '\nconfig: !json |\n  {"ok": true}',
  );
  assert.equal(
    await vscode.workspace.applyEdit(edit),
    true,
    "Failed to edit smoke-test document",
  );

  await wait(150);
  assert.equal(
    extension.isActive,
    true,
    "Extension stopped after a document edit",
  );
  await vscode.commands.executeCommand("workbench.action.closeActiveEditor");
}

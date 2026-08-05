import type * as vscode from "vscode";
import { ExtensionController } from "./controller";

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(new ExtensionController());
}

import * as vscode from "vscode";
import {
  DecorationManager,
  decorationDebounceMilliseconds,
} from "./decorations";

const CONFIGURATION_SECTION = "extendedYaml.decorations";

export class ExtensionController implements vscode.Disposable {
  private readonly decorations = new DecorationManager();
  private readonly subscriptions: vscode.Disposable[];
  private readonly pendingUpdates = new Map<
    string,
    ReturnType<typeof setTimeout>
  >();
  private disposed = false;

  public constructor() {
    this.subscriptions = [
      vscode.window.onDidChangeVisibleTextEditors((editors) => {
        this.refreshEditors(editors);
      }),
      vscode.workspace.onDidChangeTextDocument((event) => {
        this.scheduleDocument(event.document);
      }),
      vscode.workspace.onDidOpenTextDocument((document) => {
        this.refreshDocument(document);
      }),
      vscode.workspace.onDidCloseTextDocument((document) => {
        this.cancelPending(document.uri.toString());
      }),
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (!event.affectsConfiguration(CONFIGURATION_SECTION)) return;
        this.cancelAllPending();
        this.decorations.reconfigure();
        this.refreshEditors(vscode.window.visibleTextEditors);
      }),
    ];

    this.refreshEditors(vscode.window.visibleTextEditors);
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.cancelAllPending();
    for (const subscription of this.subscriptions) subscription.dispose();
    this.decorations.dispose();
  }

  private refreshEditors(editors: readonly vscode.TextEditor[]): void {
    for (const editor of editors) this.decorations.apply(editor);
  }

  private refreshDocument(document: vscode.TextDocument): void {
    const editors = vscode.window.visibleTextEditors.filter(
      (editor) => editor.document.uri.toString() === document.uri.toString(),
    );
    this.refreshEditors(editors);
  }

  private scheduleDocument(document: vscode.TextDocument): void {
    const key = document.uri.toString();
    const version = document.version;
    this.cancelPending(key);

    const timer = setTimeout(() => {
      this.pendingUpdates.delete(key);
      if (this.disposed) return;

      const editors = vscode.window.visibleTextEditors.filter(
        (editor) =>
          editor.document.uri.toString() === key &&
          editor.document.version === version,
      );
      this.refreshEditors(editors);
    }, decorationDebounceMilliseconds());

    this.pendingUpdates.set(key, timer);
  }

  private cancelPending(key: string): void {
    const timer = this.pendingUpdates.get(key);
    if (timer === undefined) return;
    clearTimeout(timer);
    this.pendingUpdates.delete(key);
  }

  private cancelAllPending(): void {
    for (const timer of this.pendingUpdates.values()) clearTimeout(timer);
    this.pendingUpdates.clear();
  }
}

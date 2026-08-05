import * as vscode from "vscode";
import { buildDecorationPlan } from "./decoration-plan";
import type { TextSpan } from "./xml-regions";

const CONFIGURATION_SECTION = "extendedYaml.decorations";

function configuration(): vscode.WorkspaceConfiguration {
  return vscode.workspace.getConfiguration(CONFIGURATION_SECTION);
}

function toRange(span: TextSpan): vscode.Range {
  return new vscode.Range(
    span.start.line,
    span.start.character,
    span.end.line,
    span.end.character,
  );
}

export function decorationsEnabled(): boolean {
  return configuration().get<boolean>("enabled", true);
}

export function decorationDebounceMilliseconds(): number {
  const configured = configuration().get<number>("debounceMilliseconds", 75);
  return Math.max(0, Math.min(1000, configured));
}

export class DecorationManager implements vscode.Disposable {
  private codeBlock!: vscode.TextEditorDecorationType;
  private markdownBlock!: vscode.TextEditorDecorationType;
  private xmlContent!: vscode.TextEditorDecorationType;
  private xmlTag!: vscode.TextEditorDecorationType;
  private disposed = false;

  public constructor() {
    this.createDecorationTypes();
  }

  public apply(editor: vscode.TextEditor): void {
    if (editor.document.languageId !== "yaml" || !decorationsEnabled()) {
      this.clear(editor);
      return;
    }

    const plan = buildDecorationPlan(editor.document);
    editor.setDecorations(this.codeBlock, plan.codeBlocks.map(toRange));
    editor.setDecorations(this.markdownBlock, plan.markdownBlocks.map(toRange));
    editor.setDecorations(this.xmlTag, plan.xmlTags.map(toRange));
    editor.setDecorations(this.xmlContent, plan.xmlContent.map(toRange));
  }

  public clear(editor: vscode.TextEditor): void {
    editor.setDecorations(this.codeBlock, []);
    editor.setDecorations(this.markdownBlock, []);
    editor.setDecorations(this.xmlTag, []);
    editor.setDecorations(this.xmlContent, []);
  }

  public reconfigure(): void {
    this.disposeDecorationTypes();
    this.createDecorationTypes();
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.disposeDecorationTypes();
  }

  private createDecorationTypes(): void {
    const config = configuration();
    this.codeBlock = vscode.window.createTextEditorDecorationType({
      backgroundColor: config.get<string>(
        "codeBlockBackground",
        "rgba(0, 0, 0, 0.15)",
      ),
      isWholeLine: false,
    });
    this.markdownBlock = vscode.window.createTextEditorDecorationType({
      backgroundColor: config.get<string>(
        "markdownBlockBackground",
        "rgba(30, 60, 90, 0.15)",
      ),
      isWholeLine: false,
    });
    this.xmlTag = vscode.window.createTextEditorDecorationType({
      color: config.get<string>("xmlTagColor", "#e06c75"),
      fontWeight: "bold",
    });
    this.xmlContent = vscode.window.createTextEditorDecorationType({
      backgroundColor: config.get<string>(
        "xmlContentBackground",
        "rgba(224, 108, 117, 0.08)",
      ),
      isWholeLine: false,
    });
  }

  private disposeDecorationTypes(): void {
    this.codeBlock.dispose();
    this.markdownBlock.dispose();
    this.xmlTag.dispose();
    this.xmlContent.dispose();
  }
}

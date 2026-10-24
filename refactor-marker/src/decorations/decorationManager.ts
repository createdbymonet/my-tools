import * as vscode from 'vscode';
import type { MarkerColor } from '../models/refactorGroup';
import type { GroupStore } from '../storage/types';
import { sameUri } from '../utils/fileIdentity';
import { inclusiveEndLine, isNonEmptyRange } from '../utils/ranges';
import { COLOR_DEFINITIONS, MARKER_COLORS } from './colors';

export class DecorationManager implements vscode.Disposable {
  private readonly types = new Map<MarkerColor, vscode.TextEditorDecorationType>();
  private readonly subscription: vscode.Disposable;

  public constructor(private readonly store: GroupStore) {
    for (const color of MARKER_COLORS) {
      this.types.set(color, vscode.window.createTextEditorDecorationType({
        backgroundColor: COLOR_DEFINITIONS[color].background,
        isWholeLine: true,
        rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
      }));
    }
    this.subscription = store.onDidChange(() => this.refresh());
  }

  public refresh(): void {
    for (const editor of vscode.window.visibleTextEditors) {
      const decorations = new Map<MarkerColor, vscode.DecorationOptions[]>(
        MARKER_COLORS.map(color => [color, []])
      );
      for (const { group, workspaceFolder } of this.store.forDocument(editor.document.uri)) {
        for (const source of group.ranges) {
          if (!sameUri(vscode.Uri.joinPath(workspaceFolder.uri, source.filePath), editor.document.uri) ||
              !isNonEmptyRange(source) || source.startLine >= editor.document.lineCount) {
            continue;
          }
          const range = editor.document.validateRange(new vscode.Range(
            source.startLine, source.startCharacter, source.endLine, source.endCharacter
          ));
          if (range.isEmpty) {
            continue;
          }
          // A selection ending at column zero excludes that last line.
          const endLine = inclusiveEndLine({
            startLine: range.start.line,
            startCharacter: range.start.character,
            endLine: range.end.line,
            endCharacter: range.end.character
          });
          const wholeLines = new vscode.Range(
            range.start.line, 0, endLine, editor.document.lineAt(endLine).text.length
          );
          const hover = new vscode.MarkdownString().appendText(group.name);
          decorations.get(group.color)?.push({ range: wholeLines, hoverMessage: hover });
        }
      }
      for (const [color, type] of this.types) {
        editor.setDecorations(type, decorations.get(color) ?? []);
      }
    }
  }

  public dispose(): void {
    this.subscription.dispose();
    for (const type of this.types.values()) {
      type.dispose();
    }
    this.types.clear();
  }
}

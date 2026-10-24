import * as vscode from 'vscode';
import type { GroupStore } from '../storage/types';
import { requireSafeSourcePath } from '../utils/pathSafety';
import { currentGroup, pickGroup } from './ui';

export async function revealGroup(store: GroupStore, argument?: unknown): Promise<void> {
  await store.whenIdle();
  const rangeId = argument && typeof argument === 'object' && 'rangeId' in argument &&
    typeof argument.rangeId === 'string' ? argument.rangeId : undefined;
  const selected = await pickGroup(store, argument);
  if (!selected) {
    return;
  }
  const selectedRange = rangeId ? selected.group.ranges.find(range => range.id === rangeId) : selected.group.ranges[0];
  if (!selectedRange) {
    void vscode.window.showInformationMessage('This Refactor Group range is no longer available.');
    return;
  }
  await requireSafeSourcePath(selected.workspaceFolder.uri, selectedRange.filePath);
  const document = await vscode.workspace.openTextDocument(vscode.Uri.joinPath(selected.workspaceFolder.uri, selectedRange.filePath));
  await store.whenIdle();
  const currentRange = (): vscode.Range | undefined => {
    const item = currentGroup(store, selected);
    if (!item) { return undefined; }
    const source = item.group.ranges.find(range => range.id === selectedRange.id);
    if (!source) {
      void vscode.window.showInformationMessage('This Refactor Group range is no longer available.');
      return undefined;
    }
    const range = new vscode.Range(source.startLine, source.startCharacter, source.endLine, source.endCharacter);
    if (range.isEmpty || !document.validateRange(range).isEqual(range)) {
      throw new Error('The stored Refactor Marker range is outside the current source file. Select the code and mark it again.');
    }
    return range;
  };
  if (!currentRange()) { return; }
  const editor = await vscode.window.showTextDocument(document, { preview: true });
  await store.whenIdle();
  const range = currentRange();
  if (!range) { return; }
  editor.selection = new vscode.Selection(range.start, range.end);
  editor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
}

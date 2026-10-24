import * as vscode from 'vscode';
import type { SourceRange } from '../models/refactorGroup';
import type { GroupStore, LocatedGroup } from '../storage/types';
import { sameUri } from '../utils/fileIdentity';
import { createId } from '../utils/ids';
import { requireSafeSourcePath } from '../utils/pathSafety';
import { rangesOverlap, selectionToRange } from '../utils/ranges';
import { isGeneratedPath } from '../utils/storagePaths';
import { currentGroup, requireWorkspace } from './ui';

export interface MarkerSelection {
  editor: vscode.TextEditor;
  document: vscode.TextDocument;
  folder: vscode.WorkspaceFolder;
  filePath: string;
  range: SourceRange;
  selection: vscode.Selection;
  version: number;
}

export function overlapsSelection(store: GroupStore, selected: MarkerSelection): boolean {
  return store.forDocument(selected.document.uri).some(item => item.group.ranges.some(range =>
    sameUri(vscode.Uri.joinPath(item.workspaceFolder.uri, range.filePath), selected.document.uri)
      && rangesOverlap(selected.range, range)));
}

export function captureSelection(store: GroupStore): MarkerSelection | undefined {
  if (!requireWorkspace()) { return undefined; }
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    void vscode.window.showWarningMessage('Open a workspace file before marking code.');
    return undefined;
  }
  if (editor.selection.isEmpty || editor.selections.length !== 1) {
    void vscode.window.showWarningMessage('Select one contiguous range of code before marking it.');
    return undefined;
  }
  const document = editor.document;
  const folder = vscode.workspace.getWorkspaceFolder(document.uri);
  if (document.isUntitled || document.uri.scheme !== 'file' || !folder) {
    void vscode.window.showWarningMessage('Refactor Groups require a saved file inside the workspace.');
    return undefined;
  }
  const filePath = vscode.workspace.asRelativePath(document.uri, false).replace(/\\/g, '/');
  if (isGeneratedPath(filePath)) {
    void vscode.window.showWarningMessage('Refactor Groups cannot mark Refactor Marker metadata or generated cache files.');
    return undefined;
  }
  const selection = editor.selection;
  const end = selection.end.character === 0 ? selection.end : document.lineAt(selection.end.line).range.end;
  const selected: MarkerSelection = {
    editor, document, folder, filePath, selection,
    range: selectionToRange(selection.start, end), version: document.version,
  };
  if (overlapsSelection(store, selected)) {
    void vscode.window.showWarningMessage('This range overlaps an existing marker, including a range in the same group.');
    return undefined;
  }
  return selected;
}

/** Native dialogs can outlive both the captured document and its workspace. */
export function selectionIsCurrent(store: GroupStore, selected: MarkerSelection): boolean {
  const { editor, document, version, selection, folder } = selected;
  const currentFolder = vscode.workspace.getWorkspaceFolder(document.uri);
  if (document.isClosed || document.version !== version || vscode.window.activeTextEditor !== editor
    || !editor.selection.isEqual(selection) || editor.selections.length !== 1
    || !currentFolder || !sameUri(currentFolder.uri, folder.uri)) {
    void vscode.window.showWarningMessage('The editor, selection, or workspace changed. Select code and try again.');
    return false;
  }
  if (overlapsSelection(store, selected)) {
    void vscode.window.showWarningMessage('This range overlaps an existing marker, including a range in the same group.');
    return false;
  }
  return true;
}

/** Both new groups and appended ranges use the same current-selection safety checks. */
export async function selectionIsReady(store: GroupStore, selected: MarkerSelection): Promise<boolean> {
  await requireSafeSourcePath(selected.folder.uri, selected.filePath);
  await store.whenIdle();
  return selectionIsCurrent(store, selected);
}

/** Explicit Add and Create with an existing full path append through one operation. */
export async function appendSelectionToGroup(
  store: GroupStore, selected: MarkerSelection, item: LocatedGroup
): Promise<void> {
  if (!sameUri(item.workspaceFolder.uri, selected.folder.uri)) {
    void vscode.window.showWarningMessage('Select a group in the same workspace folder as the code.');
    return;
  }
  if (!await selectionIsReady(store, selected)) { return; }
  const current = currentGroup(store, item);
  if (!current) { return; }
  await store.addRange(current, {
    id: createId(), filePath: selected.filePath, ...selected.range, addedAt: new Date().toISOString(),
  });
}

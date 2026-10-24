import * as vscode from 'vscode';
import { exportFileName, findExportFileNameCollision, renderFunctionDraft } from '../export/functionDraft';
import { buildHierarchy, findTopLevelHierarchy } from '../hierarchy/groupHierarchy';
import { GroupTreeItem, VirtualGroupTreeItem } from '../sidebar/groupTreeItem';
import type { GroupStore } from '../storage/types';
import { writeDraft } from '../utils/draftFile';
import { sameUri, uriKey } from '../utils/fileIdentity';
import { createId } from '../utils/ids';
import { requireSafeCacheDirectory, requireSafeSourcePath } from '../utils/pathSafety';
import { CACHE_DIRECTORY } from '../utils/storagePaths';
import { requireWorkspace, resolveGroup } from './ui';

interface ExportTarget { name: string; workspaceFolder: vscode.WorkspaceFolder }

function requireSavedDraft(uri: vscode.Uri): void {
  if (vscode.workspace.textDocuments.some(document => sameUri(document.uri, uri) && document.isDirty)) {
    throw new Error('The function draft has unsaved changes. Save or close it before exporting again.');
  }
}

async function pickExportTarget(store: GroupStore, argument?: unknown): Promise<ExportTarget | undefined> {
  if (!requireWorkspace()) { return undefined; }
  if (argument instanceof VirtualGroupTreeItem) {
    return { name: argument.path, workspaceFolder: argument.workspaceFolder };
  }
  if (argument !== undefined) {
    const item = resolveGroup(store, argument instanceof GroupTreeItem ? argument.item : argument);
    if (!item) {
      void vscode.window.showInformationMessage('This Refactor Group is no longer available.');
      return undefined;
    }
    return { name: item.group.name, workspaceFolder: item.workspaceFolder };
  }
  const items = [];
  for (const folder of vscode.workspace.workspaceFolders ?? []) {
    const groups = store.getAll().filter(item => sameUri(item.workspaceFolder.uri, folder.uri)).map(item => item.group);
    for (const root of buildHierarchy(groups)) {
      items.push({
        label: root.segment, description: folder.name, detail: folder.uri.fsPath,
        name: root.path, workspaceFolder: folder,
      });
    }
  }
  if (items.length === 0) {
    void vscode.window.showInformationMessage('No Refactor Groups are available in this workspace.');
    return undefined;
  }
  return vscode.window.showQuickPick(items, {
    title: 'Refactor Marker: Export Group as Function',
    placeHolder: 'Choose a top-level hierarchy to export as a draft',
  });
}

export async function exportGroupAsFunction(store: GroupStore, argument?: unknown): Promise<void> {
  await store.whenIdle();
  const target = await pickExportTarget(store, argument);
  if (!target) { return; }
  await store.whenIdle();
  const { workspaceFolder } = target;
  const groups = store.getAll().filter(item => sameUri(item.workspaceFolder.uri, workspaceFolder.uri)).map(item => item.group);
  const root = findTopLevelHierarchy(groups, target.name);
  if (!root) { throw new Error('This hierarchy no longer exists.'); }
  const collision = findExportFileNameCollision(groups, target.name);
  if (collision) {
    void vscode.window.showWarningMessage(collision);
    return;
  }
  const fileName = exportFileName(target.name);
  const outputUri = vscode.Uri.joinPath(workspaceFolder.uri, CACHE_DIRECTORY, fileName);
  await requireSafeCacheDirectory(workspaceFolder.uri);
  requireSavedDraft(outputUri);
  const snapshots = new Map<string, { document: vscode.TextDocument; version: number }>();
  const contents = await renderFunctionDraft(root, async range => {
    const uri = vscode.Uri.joinPath(workspaceFolder.uri, range.filePath);
    try {
      await requireSafeSourcePath(workspaceFolder.uri, range.filePath);
      // Check disk existence even when VS Code still has an orphaned buffer open.
      const stat = await vscode.workspace.fs.stat(uri);
      if (!(stat.type & vscode.FileType.File)) { throw new Error('The source is not a file.'); }
      const document = await vscode.workspace.openTextDocument(uri);
      const selected = new vscode.Range(range.startLine, range.startCharacter, range.endLine, range.endCharacter);
      if (!document.validateRange(selected).isEqual(selected) || selected.isEmpty) {
        throw new Error('The stored range is outside the current source file.');
      }
      const key = uriKey(uri);
      const previous = snapshots.get(key);
      if (previous && previous.version !== document.version) { throw new Error('The source changed during export.'); }
      snapshots.set(key, { document, version: document.version });
      return document.getText(selected);
    } catch (error: unknown) {
      throw new Error(`Cannot read ${range.filePath}: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
    }
  });
  const requireCurrentSources = async (): Promise<void> => {
    // TextDocument edits happen before queued storage tracking can finish.
    await store.whenIdle();
    requireSavedDraft(outputUri);
    for (const { document, version } of snapshots.values()) {
      if (document.isClosed || document.version !== version) {
        throw new Error('A source file changed during export. Run Export Group as Function again.');
      }
    }
    const current = store.getAll().filter(item => sameUri(item.workspaceFolder.uri, workspaceFolder.uri)).map(item => item.group);
    if (JSON.stringify(current) !== JSON.stringify(groups)) {
      throw new Error('Groups changed during export. Run Export Group as Function again.');
    }
  };
  await requireCurrentSources();
  const written = await writeDraft({
    exists: async () => {
      try { await vscode.workspace.fs.stat(outputUri); return true; }
      catch (error: unknown) {
        if (error instanceof vscode.FileSystemError && error.code === 'FileNotFound') { return false; }
        throw error;
      }
    },
    confirmOverwrite: async () => await vscode.window.showWarningMessage(
      `Overwrite ${fileName}?`,
      { modal: true, detail: 'This replaces the existing function draft. Original source files are unchanged.' },
      'Overwrite',
    ) === 'Overwrite',
    write: async overwrite => {
      await requireCurrentSources();
      const directory = vscode.Uri.joinPath(workspaceFolder.uri, CACHE_DIRECTORY);
      const temporary = vscode.Uri.joinPath(directory, `draft.${createId()}.tmp`);
      await requireSafeCacheDirectory(workspaceFolder.uri);
      await vscode.workspace.fs.createDirectory(directory);
      await requireSafeCacheDirectory(workspaceFolder.uri);
      try {
        await vscode.workspace.fs.writeFile(temporary, Buffer.from(contents, 'utf8'));
        await requireSafeCacheDirectory(workspaceFolder.uri);
        // Filesystem writes and overwrite dialogs can allow further edits or tracking.
        await requireCurrentSources();
        // If a new target appeared while exporting, fail instead of overwriting it.
        await vscode.workspace.fs.rename(temporary, outputUri, { overwrite });
      } finally {
        try { await vscode.workspace.fs.delete(temporary); }
        catch (error: unknown) {
          if (!(error instanceof vscode.FileSystemError && error.code === 'FileNotFound')) { throw error; }
        }
      }
    },
  });
  if (written) {
    await vscode.window.showTextDocument(await vscode.workspace.openTextDocument(outputUri), { preview: true });
  }
}

import * as vscode from 'vscode';
import { COLOR_DEFINITIONS, MARKER_COLORS } from '../decorations/colors';
import type { MarkerColor } from '../models/refactorGroup';
import type { GroupStore, LocatedGroup } from '../storage/types';
import { sameUri } from '../utils/fileIdentity';
import { buildGroupPickItems } from './groupPickItems';
export { validateGroupName } from '../validation/groupNames';

export function requireWorkspace(): boolean {
  if (!vscode.workspace.workspaceFolders?.length) {
    void vscode.window.showWarningMessage('Refactor Marker requires an open workspace.');
    return false;
  }
  return true;
}

/** Group names are exact, case-sensitive full paths within one workspace folder. */
export function findGroupByName(store: GroupStore, folder: vscode.WorkspaceFolder, name: string): LocatedGroup | undefined {
  return store.getAll().find(item => sameUri(item.workspaceFolder.uri, folder.uri) && item.group.name === name);
}

export async function pickColor(): Promise<MarkerColor | undefined> {
  const selected = await vscode.window.showQuickPick(MARKER_COLORS.map(color => ({
    label: COLOR_DEFINITIONS[color].label,
    iconPath: new vscode.ThemeIcon('circle-filled', new vscode.ThemeColor(COLOR_DEFINITIONS[color].themeColor)),
    color
  })), {
    title: 'Refactor Marker: Select Color',
    placeHolder: 'Choose a color for the group'
  });
  return selected?.color;
}

/** Resolve references against current storage so old tree items cannot resurrect deleted groups. */
export function resolveGroup(store: GroupStore, value: unknown): LocatedGroup | undefined {
  const reference: unknown = value && typeof value === 'object' && 'item' in value ? value.item : value;
  if (!reference || typeof reference !== 'object' || !('group' in reference) ||
      !('workspaceFolder' in reference)) {
    return undefined;
  }
  const group = reference.group;
  const folder = reference.workspaceFolder;
  if (!group || typeof group !== 'object' || !('id' in group) || typeof group.id !== 'string' ||
      !folder || typeof folder !== 'object' || !('uri' in folder) || !(folder.uri instanceof vscode.Uri)) {
    return undefined;
  }
  const folderUri = folder.uri;
  return store.getAll().find(item =>
    item.group.id === group.id && sameUri(item.workspaceFolder.uri, folderUri)
  );
}

export async function pickGroup(
  store: GroupStore, argument?: unknown, folder?: vscode.WorkspaceFolder
): Promise<LocatedGroup | undefined> {
  if (!requireWorkspace()) {
    return undefined;
  }
  await store.whenIdle();
  if (argument !== undefined) {
    const current = currentGroup(store, argument);
    if (current && folder && !sameUri(current.workspaceFolder.uri, folder.uri)) {
      void vscode.window.showWarningMessage('Select a group in the same workspace folder as the code.');
      return undefined;
    }
    return current;
  }
  const groups = store.getAll().filter(item => !folder || sameUri(item.workspaceFolder.uri, folder.uri));
  if (groups.length === 0) {
    void vscode.window.showInformationMessage('No Refactor Groups are available in this workspace.');
    return undefined;
  }
  const multiRoot = (vscode.workspace.workspaceFolders?.length ?? 0) > 1;
  const selected = await vscode.window.showQuickPick(buildGroupPickItems(groups, multiRoot), {
    title: 'Refactor Marker: Select Group',
    placeHolder: 'Choose a Refactor Group'
  });
  return selected ? currentGroup(store, selected.item) : undefined;
}

export function currentGroup(store: GroupStore, argument: unknown): LocatedGroup | undefined {
  const item = resolveGroup(store, argument);
  if (!item) {
    void vscode.window.showInformationMessage('This Refactor Group is no longer available.');
  }
  return item;
}

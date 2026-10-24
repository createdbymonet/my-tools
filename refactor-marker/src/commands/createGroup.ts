import * as vscode from 'vscode';
import type { GroupStore } from '../storage/types';
import { createId } from '../utils/ids';
import { appendSelectionToGroup, captureSelection, selectionIsReady } from './selection';
import { findGroupByName, pickColor, validateGroupName } from './ui';

export async function createGroup(store: GroupStore): Promise<void> {
  await store.whenIdle();
  const selected = captureSelection(store);
  if (!selected) { return; }
  const name = await vscode.window.showInputBox({
    title: 'Refactor Marker: Create Group',
    prompt: 'Enter a group path; an existing name adds code to that group',
    placeHolder: 'For example, Order/Validation',
    validateInput: validateGroupName,
  });
  if (name === undefined || validateGroupName(name)) { return; }
  const groupName = name.trim();
  await store.whenIdle();
  const existing = findGroupByName(store, selected.folder, groupName);
  if (existing) {
    await appendSelectionToGroup(store, selected, existing);
    return;
  }
  const color = await pickColor();
  if (!color) { return; }
  if (!await selectionIsReady(store, selected)) { return; }
  const createdMeanwhile = findGroupByName(store, selected.folder, groupName);
  if (createdMeanwhile) {
    await appendSelectionToGroup(store, selected, createdMeanwhile);
    return;
  }
  const now = new Date().toISOString();
  await store.create(selected.folder, {
    id: createId(), name: groupName, color,
    ranges: [{ id: createId(), filePath: selected.filePath, ...selected.range, addedAt: now }],
    createdAt: now, updatedAt: now,
  });
}

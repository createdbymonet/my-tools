import * as vscode from 'vscode';
import type { GroupStore } from '../storage/types';
import { currentGroup, findGroupByName, pickGroup, validateGroupName } from './ui';

export async function renameGroup(store: GroupStore, argument?: unknown): Promise<void> {
  const item = await pickGroup(store, argument);
  if (!item) {
    return;
  }
  const validateName = (input: string): string | undefined => {
    const problem = validateGroupName(input);
    if (problem) { return problem; }
    const existing = findGroupByName(store, item.workspaceFolder, input.trim());
    return existing && existing.group.id !== item.group.id
      ? 'A group with this full path already exists in this workspace folder. Choose a different name.'
      : undefined;
  };
  const name = await vscode.window.showInputBox({
    title: 'Refactor Marker: Rename Group',
    prompt: 'Enter an unused group path; child groups keep their current names',
    value: item.group.name,
    validateInput: validateName
  });
  if (name === undefined) { return; }
  await store.whenIdle();
  const problem = validateName(name);
  if (problem) {
    void vscode.window.showWarningMessage(problem);
    return;
  }
  const current = currentGroup(store, item);
  if (current) {
    await store.update(current, { name: name.trim() });
  }
}

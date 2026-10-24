import * as vscode from 'vscode';
import type { GroupStore } from '../storage/types';
import { requireWorkspace } from './ui';

export async function clearAll(store: GroupStore): Promise<void> {
  if (!requireWorkspace()) {
    return;
  }
  if (store.getAll().length === 0) {
    void vscode.window.showInformationMessage('No Refactor Groups are available in this workspace.');
    return;
  }
  const choice = await vscode.window.showWarningMessage(
    'Clear all Refactor Groups in this workspace?',
    { modal: true, detail: 'This removes marker metadata and highlights. Your source code stays unchanged.' },
    'Clear All Groups'
  );
  if (choice === 'Clear All Groups') {
    await store.clearAll();
  }
}

import * as vscode from 'vscode';
import type { GroupStore } from '../storage/types';
import { changeColor } from './changeColor';
import { clearAll } from './clearAll';
import { createGroup } from './createGroup';
import { deleteGroup } from './deleteGroup';
import { renameGroup } from './renameGroup';
import { revealGroup } from './revealGroup';
import { addToExistingGroup } from './addToExistingGroup';
import { exportGroupAsFunction } from './exportGroupAsFunction';

export function registerCommands(
  context: vscode.ExtensionContext,
  store: GroupStore,
  output: vscode.OutputChannel
): void {
  const commands: ReadonlyArray<{
    id: string;
    action: string;
    run: (argument?: unknown) => Promise<void>;
  }> = [
    { id: 'refactorMarker.createGroup', action: 'create the group', run: () => createGroup(store) },
    { id: 'refactorMarker.addToExistingGroup', action: 'add the range', run: argument => addToExistingGroup(store, argument) },
    { id: 'refactorMarker.exportGroupAsFunction', action: 'export the function draft', run: argument => exportGroupAsFunction(store, argument) },
    { id: 'refactorMarker.renameGroup', action: 'rename the group', run: argument => renameGroup(store, argument) },
    { id: 'refactorMarker.changeColor', action: 'change the group color', run: argument => changeColor(store, argument) },
    { id: 'refactorMarker.deleteGroup', action: 'delete the group', run: argument => deleteGroup(store, argument) },
    { id: 'refactorMarker.clearAll', action: 'clear the groups', run: () => clearAll(store) },
    { id: 'refactorMarker.revealGroup', action: 'open the group file', run: argument => revealGroup(store, argument) }
  ];
  for (const command of commands) {
    context.subscriptions.push(vscode.commands.registerCommand(command.id, async (argument?: unknown) => {
      try {
        await command.run(argument);
      } catch (error: unknown) {
        output.appendLine(`[${new Date().toISOString()}] ${command.id}: ${
          error instanceof Error ? error.stack ?? error.message : String(error)
        }`);
        void vscode.window.showErrorMessage(
          `Refactor Marker could not ${command.action}: ${error instanceof Error ? error.message : String(error)} See the Refactor Marker output for details.`
        );
      }
    }));
  }
}

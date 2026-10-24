import * as vscode from 'vscode';
import { registerCommands } from './commands';
import { DecorationManager } from './decorations/decorationManager';
import { GroupTreeProvider } from './sidebar/groupTreeProvider';
import { GroupStorage } from './storage/groupStorage';

let storage: GroupStorage | undefined;
let output: vscode.OutputChannel | undefined;
let inputSubscriptions: vscode.Disposable | undefined;

export async function activate(context: vscode.ExtensionContext) {
  output = vscode.window.createOutputChannel('Refactor Marker');
  storage = new GroupStorage(output);
  // Initialize is the first queued operation. Edits during async loading follow it.
  const initialized = storage.initialize();
  const store = storage;
  const decorationManager = new DecorationManager(store);
  const treeProvider = new GroupTreeProvider(store);
  const treeView = vscode.window.createTreeView('refactorMarker.groups', {
    treeDataProvider: treeProvider,
    showCollapseAll: true,
  });
  const reportError = (error: unknown): void => {
    output?.appendLine(String(error));
    void vscode.window.showErrorMessage('Unable to save Refactor Marker data. See the Refactor Marker output.');
  };

  inputSubscriptions = vscode.Disposable.from(
    vscode.workspace.onDidChangeTextDocument(event => {
      void store.trackDocument(event).catch(reportError);
    }),
    vscode.workspace.onDidSaveTextDocument(() => {
      void store.flush().catch(reportError);
    }),
    vscode.workspace.onDidChangeWorkspaceFolders(event => {
      void store.updateWorkspaceFolders(event).catch(reportError);
    }),
  );
  context.subscriptions.push(
    output, store, decorationManager, treeProvider, treeView, inputSubscriptions,
    vscode.window.onDidChangeActiveTextEditor(() => decorationManager.refresh()),
    vscode.window.onDidChangeVisibleTextEditors(() => decorationManager.refresh()),
    vscode.workspace.onDidOpenTextDocument(() => decorationManager.refresh()),
  );
  registerCommands(context, store, output);
  await initialized;
  decorationManager.refresh();
}

export async function deactivate(): Promise<void> {
  // Stop accepting edits before draining and saving the queue.
  inputSubscriptions?.dispose();
  try {
    await storage?.flush();
  } catch (error: unknown) {
    output?.appendLine(`Unable to save markers during shutdown: ${String(error)}`);
  }
}

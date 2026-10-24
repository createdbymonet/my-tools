import type * as vscode from 'vscode';
import type { RefactorGroup, RefactorRange } from '../models/refactorGroup';

export interface LocatedGroup {
  group: RefactorGroup;
  workspaceFolder: vscode.WorkspaceFolder;
}

export interface GroupStore extends vscode.Disposable {
  readonly onDidChange: vscode.Event<void>;
  getAll(): LocatedGroup[];
  forDocument(uri: vscode.Uri): LocatedGroup[];
  whenIdle(): Promise<void>;
  create(folder: vscode.WorkspaceFolder, group: RefactorGroup): Promise<void>;
  addRange(item: LocatedGroup, range: RefactorRange): Promise<void>;
  update(item: LocatedGroup, changes: Partial<Pick<RefactorGroup, 'name' | 'color'>>): Promise<void>;
  delete(item: LocatedGroup): Promise<void>;
  clearAll(): Promise<void>;
}

import * as vscode from 'vscode';
import { randomUUID } from 'node:crypto';
import { realpath } from 'node:fs/promises';
import * as path from 'node:path';
import { TextDecoder, TextEncoder } from 'node:util';
import type { RefactorGroup, RefactorRange } from '../models/refactorGroup';
import type { TextChange } from '../tracking/rangeTracker';
import { filePathKey, sameUri, uriKey } from '../utils/fileIdentity';
import { requireSafeCacheDirectory, requireSafeLegacyMetadataPath } from '../utils/pathSafety';
import { rangesOverlap } from '../utils/ranges';
import { CACHE_DIRECTORY, LEGACY_METADATA_PATH, METADATA_PATH } from '../utils/storagePaths';
import { deserializeLegacyMarkerData, deserializeMarkerDataWithNormalization, serializeMarkerData } from './serialization';
import { trackGroups } from './trackGroups';
import type { GroupStore, LocatedGroup } from './types';

interface FolderState {
  folder: vscode.WorkspaceFolder;
  groups: RefactorGroup[];
  writable: boolean;
  dirty: boolean;
  loadError?: string;
  physicalRoot?: string;
}

function cloneGroup(group: RefactorGroup): RefactorGroup {
  return { ...group, ranges: group.ranges.map(range => ({ ...range })) };
}

function isMissingFile(error: unknown): boolean {
  return error instanceof vscode.FileSystemError && error.code === 'FileNotFound';
}

class CrossFolderOverlapError extends Error {}
class GroupNormalizationError extends Error {}

/** Owns only marker metadata. All mutations are serialized, including edit tracking. */
export class GroupStorage implements GroupStore {
  private readonly states = new Map<string, FolderState>();
  private readonly changed = new vscode.EventEmitter<void>();
  readonly onDidChange = this.changed.event;
  private pending: Promise<void> = Promise.resolve();
  private saveTimer: ReturnType<typeof setTimeout> | undefined;
  private disposed = false;

  constructor(private readonly output: vscode.OutputChannel) {}

  initialize(): Promise<void> {
    return this.enqueue(async () => {
      for (const folder of vscode.workspace.workspaceFolders ?? []) {
        await this.loadFolder(folder);
      }
      this.changed.fire();
    });
  }

  private async loadFolder(folder: vscode.WorkspaceFolder): Promise<void> {
    const state: FolderState = { folder, groups: [], writable: true, dirty: false };
    this.states.set(uriKey(folder.uri), state);
    try {
      if (folder.uri.scheme === 'file') {
        const physicalRoot = await realpath(folder.uri.fsPath);
        const owner = [...this.states.values()].find(other => other !== state && other.physicalRoot !== undefined
          && filePathKey(other.physicalRoot) === filePathKey(physicalRoot));
        if (owner) {
          state.writable = false;
          state.loadError = `Refactor Marker cannot use duplicate workspace roots for the same physical folder (${owner.folder.name} and ${folder.name}). Remove the duplicate root and reload the window.`;
          this.output.appendLine(state.loadError);
          void vscode.window.showErrorMessage(state.loadError);
          return;
        }
        const inconsistent = [...this.states.values()].find(other => {
          if (other === state || other.physicalRoot === undefined) { return false; }
          const belowOther = path.relative(other.physicalRoot, physicalRoot);
          const belowCurrent = path.relative(physicalRoot, other.physicalRoot);
          const isDescendant = (relative: string): boolean => relative !== '' && relative !== '..'
            && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
          if (isDescendant(belowOther)) {
            return !sameUri(vscode.Uri.joinPath(other.folder.uri, ...belowOther.split(path.sep)), folder.uri);
          }
          return isDescendant(belowCurrent)
            && !sameUri(vscode.Uri.joinPath(folder.uri, ...belowCurrent.split(path.sep)), other.folder.uri);
        });
        if (inconsistent) {
          state.writable = false;
          state.loadError = `Refactor Marker cannot use inconsistent workspace root aliases (${inconsistent.folder.name} and ${folder.name}). Open nested folders through the same root path, remove the conflicting root, and reload the window.`;
          this.output.appendLine(state.loadError);
          void vscode.window.showErrorMessage(state.loadError);
          return;
        }
        state.physicalRoot = physicalRoot;
      }
      await requireSafeCacheDirectory(folder.uri);
      const bytes = await vscode.workspace.fs.readFile(this.dataUri(folder));
      const loaded = deserializeMarkerDataWithNormalization(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
      const groups = loaded.data.groups;
      this.requireNoCrossFolderOverlap(state, groups);
      if (loaded.normalized) {
        try {
          await this.write(state, groups);
          this.output.appendLine(`Merged duplicate Refactor Marker groups and ranges in ${this.dataUri(folder).toString()}.`);
        } catch (error: unknown) {
          throw new GroupNormalizationError(`Unable to save merged Refactor Marker groups. The original metadata is unchanged. Resolve the write failure and reload the window. ${String(error)}`);
        }
      }
      state.groups = groups;
    } catch (error: unknown) {
      if (isMissingFile(error)) {
        await this.migrateLegacy(state);
        return;
      }
      state.writable = false;
      state.loadError = error instanceof CrossFolderOverlapError || error instanceof GroupNormalizationError ? error.message
        : 'Unable to load Refactor Marker data. Repair the metadata file and reload the window before making changes.';
      this.output.appendLine(`Unable to load ${this.dataUri(folder).toString()}: ${String(error)}`);
      void vscode.window.showErrorMessage(error instanceof CrossFolderOverlapError || error instanceof GroupNormalizationError
        ? error.message : 'Unable to load Refactor Marker data.');
    }
  }

  private async migrateLegacy(state: FolderState): Promise<void> {
    const legacy = vscode.Uri.joinPath(state.folder.uri, LEGACY_METADATA_PATH);
    let bytes: Uint8Array;
    try {
      await requireSafeLegacyMetadataPath(state.folder.uri);
      bytes = await vscode.workspace.fs.readFile(legacy);
    } catch (error: unknown) {
      if (isMissingFile(error)) {
        return;
      }
      this.reportMigrationFailure(state, legacy, error);
      return;
    }
    try {
      const migrated = deserializeLegacyMarkerData(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
      this.requireNoCrossFolderOverlap(state, migrated.groups);
      // The existing legacy file is retained; the new file is the migration checkpoint.
      await this.write(state, migrated.groups, false);
      state.groups = migrated.groups;
    } catch (error: unknown) {
      this.reportMigrationFailure(state, legacy, error);
    }
  }

  private reportMigrationFailure(state: FolderState, legacy: vscode.Uri, error: unknown): void {
    state.writable = false;
    state.loadError = 'Unable to migrate Refactor Marker data. The legacy file is unchanged. Repair the migration problem and reload the window before making changes.';
    if (error instanceof CrossFolderOverlapError) { state.loadError += ` ${error.message}`; }
    this.output.appendLine(`Unable to migrate ${legacy.toString()} to ${this.dataUri(state.folder).toString()}: ${String(error)}`);
    void vscode.window.showErrorMessage('Unable to migrate Refactor Marker data. The legacy file is unchanged. See the Refactor Marker output.');
  }

  getAll(): LocatedGroup[] {
    return [...this.states.values()].flatMap(state => state.groups.map(group => ({
      group: cloneGroup(group), workspaceFolder: state.folder,
    })));
  }

  forDocument(uri: vscode.Uri): LocatedGroup[] {
    return this.getAll().filter(item =>
      item.group.ranges.some(range => sameUri(vscode.Uri.joinPath(item.workspaceFolder.uri, range.filePath), uri)));
  }

  /** Let readers observe every tracking or mutation operation already queued. */
  whenIdle(): Promise<void> {
    return this.enqueue(async () => {});
  }

  create(folder: vscode.WorkspaceFolder, group: RefactorGroup): Promise<void> {
    const created = cloneGroup(group);
    created.name = created.name.trim();
    return this.enqueue(async () => {
      const state = this.requireState(folder);
      const existing = state.groups.find(candidate => candidate.name === created.name);
      if (existing) {
        await this.appendRanges(state, existing, created.ranges);
        return;
      }
      const next = [...state.groups, created];
      await this.commit(state, next);
    });
  }

  addRange(item: LocatedGroup, range: RefactorRange): Promise<void> {
    const added = { ...range };
    return this.enqueue(async () => {
      const state = this.requireState(item.workspaceFolder);
      const current = this.requireGroup(state, item.group.id);
      await this.appendRanges(state, current, [added]);
    });
  }

  update(item: LocatedGroup, changes: Partial<Pick<RefactorGroup, 'name' | 'color'>>): Promise<void> {
    const requested = { ...changes };
    if (requested.name !== undefined) { requested.name = requested.name.trim(); }
    return this.enqueue(async () => {
      const state = this.requireState(item.workspaceFolder);
      const current = this.requireGroup(state, item.group.id);
      if (requested.name !== undefined && state.groups.some(group => group.id !== current.id && group.name === requested.name)) {
        throw new Error('A Refactor Group with this name already exists in this workspace folder. Choose a different name or add code to the existing group.');
      }
      const updated = { ...current, ...requested, updatedAt: new Date().toISOString() };
      const next = state.groups.map(group => group.id === current.id ? updated : group);
      await this.commit(state, next);
    });
  }

  delete(item: LocatedGroup): Promise<void> {
    return this.enqueue(async () => {
      const state = this.requireState(item.workspaceFolder);
      this.requireGroup(state, item.group.id);
      await this.commit(state, state.groups.filter(group => group.id !== item.group.id));
    });
  }

  clearAll(): Promise<void> {
    return this.enqueue(async () => {
      // Preflight every folder before clearing any, so corrupt files remain untouched.
      for (const state of this.states.values()) {
        this.requireState(state.folder);
      }
      for (const state of this.states.values()) {
        if (state.groups.length > 0) {
          await this.commit(state, []);
        }
      }
    });
  }

  trackDocument(event: vscode.TextDocumentChangeEvent): Promise<void> {
    if (event.contentChanges.length === 0) {
      return Promise.resolve();
    }
    // Copy now: VS Code's live document may have changed again by the time the queue runs.
    const uri = uriKey(event.document.uri);
    const changes: TextChange[] = event.contentChanges.map(change => ({
      range: {
        start: { line: change.range.start.line, character: change.range.start.character },
        end: { line: change.range.end.line, character: change.range.end.character },
      },
      text: change.text,
    }));
    return this.enqueue(async () => {
      const changedStates = new Set<FolderState>();
      let removed = false;
      for (const state of this.states.values()) {
        if (!state.writable) {
          continue;
        }
        const tracked = trackGroups(state.groups, changes,
          filePath => uriKey(vscode.Uri.joinPath(state.folder.uri, filePath)) === uri, new Date().toISOString());
        if (tracked.changed) {
          state.groups = tracked.groups;
          changedStates.add(state);
        }
        removed ||= tracked.removed;
      }
      // Nested workspace roots can own different relative paths to one document.
      // Compare after every root has tracked this event, and scope IDs to their root.
      for (const [state, conflicts] of this.rangeConflicts(undefined, false)) {
        state.groups = state.groups.map(group => group.ranges.some(range => conflicts.has(range.id))
          ? { ...group, ranges: group.ranges.filter(range => !conflicts.has(range.id)), updatedAt: new Date().toISOString() }
          : group);
        changedStates.add(state);
        removed = true;
      }
      if (changedStates.size > 0) {
        for (const state of changedStates) { state.dirty = true; }
        this.changed.fire();
        this.scheduleSave();
      }
      if (removed) {
        void vscode.window.showWarningMessage(
          'Some Refactor Marker ranges were removed because an edit deleted, replaced, or merged their code.');
      }
    });
  }

  updateWorkspaceFolders(event: vscode.WorkspaceFoldersChangeEvent): Promise<void> {
    return this.enqueue(async () => {
      try {
        await this.saveDirty();
      } finally {
        // A failed write must not leave the store attached to an obsolete topology.
        for (const folder of event.removed) {
          this.states.delete(uriKey(folder.uri));
        }
        for (const folder of event.added) {
          await this.loadFolder(folder);
        }
        this.changed.fire();
      }
    });
  }

  flush(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = undefined;
    }
    return this.enqueue(async () => {
      // Earlier queued tracking work may have scheduled a new timer while flush waited.
      if (this.saveTimer) {
        clearTimeout(this.saveTimer);
        this.saveTimer = undefined;
      }
      await this.saveDirty();
    });
  }

  private scheduleSave(): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    this.saveTimer = setTimeout(() => {
      this.saveTimer = undefined;
      void this.enqueue(() => this.saveDirty()).catch(error => {
        this.output.appendLine(`Unable to save tracked ranges: ${String(error)}`);
        void vscode.window.showErrorMessage('Unable to save Refactor Marker data. See the Refactor Marker output.');
      });
    }, 300);
  }

  private async saveDirty(): Promise<void> {
    const failures: unknown[] = [];
    for (const state of this.states.values()) {
      if (state.dirty) {
        try {
          await this.write(state, state.groups);
          state.dirty = false;
        } catch (error: unknown) {
          // Continue saving healthy roots, and retain this root's dirty state for retry.
          failures.push(new Error(`Unable to save ${this.dataUri(state.folder).toString()}: ${String(error)}`, { cause: error }));
        }
      }
    }
    if (failures.length > 0) {
      throw new AggregateError(failures, failures.map(String).join('\n'));
    }
  }

  private async commit(state: FolderState, next: RefactorGroup[]): Promise<void> {
    this.requireNoCrossFolderOverlap(state, next);
    await this.write(state, next);
    state.groups = next;
    state.dirty = false;
    this.changed.fire();
  }

  private async appendRanges(state: FolderState, current: RefactorGroup, ranges: readonly RefactorRange[]): Promise<void> {
    const updated = { ...current, ranges: [...current.ranges, ...ranges], updatedAt: new Date().toISOString() };
    await this.commit(state, state.groups.map(group => group.id === current.id ? updated : group));
  }

  private rangeConflicts(candidate?: { state: FolderState; groups: RefactorGroup[] }, crossFoldersOnly = true): Map<FolderState, Set<string>> {
    const conflicts = new Map<FolderState, Set<string>>();
    const byDocument = new Map<string, { state: FolderState; range: RefactorRange }[]>();
    for (const state of this.states.values()) {
      const groups = candidate?.state === state ? candidate.groups : state.groups;
      for (const group of groups) {
        for (const range of group.ranges) {
          const key = uriKey(vscode.Uri.joinPath(state.folder.uri, range.filePath));
          const previous = byDocument.get(key) ?? [];
          for (const other of previous) {
            if ((!crossFoldersOnly || other.state !== state) && rangesOverlap(other.range, range)) {
              for (const entry of [other, { state, range }]) {
                const ids = conflicts.get(entry.state) ?? new Set<string>();
                ids.add(entry.range.id);
                conflicts.set(entry.state, ids);
              }
            }
          }
          previous.push({ state, range });
          byDocument.set(key, previous);
        }
      }
    }
    return conflicts;
  }

  private requireNoCrossFolderOverlap(state: FolderState, groups: RefactorGroup[]): void {
    if (this.rangeConflicts({ state, groups }).has(state)) {
      throw new CrossFolderOverlapError('Overlapping Refactor Marker ranges across workspace folders. This folder is unchanged. Resolve the conflicting markers and reload the window.');
    }
  }

  private async write(state: FolderState, groups: RefactorGroup[], overwrite = true): Promise<void> {
    // Validate before touching disk; callers cannot bypass overlap/path checks.
    const contents = new TextEncoder().encode(serializeMarkerData(groups));
    const directory = vscode.Uri.joinPath(state.folder.uri, CACHE_DIRECTORY);
    const temporary = vscode.Uri.joinPath(directory, `refactor-marker.${randomUUID()}.tmp`);
    await requireSafeCacheDirectory(state.folder.uri);
    await vscode.workspace.fs.createDirectory(directory);
    await requireSafeCacheDirectory(state.folder.uri);
    try {
      await vscode.workspace.fs.writeFile(temporary, contents);
      await requireSafeCacheDirectory(state.folder.uri);
      await vscode.workspace.fs.rename(temporary, this.dataUri(state.folder), { overwrite });
    } catch (error: unknown) {
      try {
        await vscode.workspace.fs.delete(temporary);
      } catch (cleanupError: unknown) {
        if (!(cleanupError instanceof vscode.FileSystemError && cleanupError.code === 'FileNotFound')) {
          this.output.appendLine(`Unable to remove temporary marker file: ${String(cleanupError)}`);
        }
      }
      throw error;
    }
  }

  private dataUri(folder: vscode.WorkspaceFolder): vscode.Uri {
    return vscode.Uri.joinPath(folder.uri, METADATA_PATH);
  }

  private requireState(folder: vscode.WorkspaceFolder): FolderState {
    const state = this.states.get(uriKey(folder.uri));
    if (!state) {
      throw new Error('The workspace folder is no longer open.');
    }
    if (!state.writable) {
      throw new Error(state.loadError ?? 'Unable to load Refactor Marker data.');
    }
    return state;
  }

  private requireGroup(state: FolderState, id: string): RefactorGroup {
    const group = state.groups.find(candidate => candidate.id === id);
    if (!group) {
      throw new Error('This Refactor Group no longer exists.');
    }
    return group;
  }

  private enqueue(operation: () => Promise<void>): Promise<void> {
    if (this.disposed) {
      return Promise.reject(new Error('Refactor Marker storage has been disposed.'));
    }
    const result = this.pending.then(operation);
    // The caller handles its error; keep the queue usable after a failed operation.
    this.pending = result.catch(() => undefined);
    return result;
  }

  dispose(): void {
    this.disposed = true;
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }
    this.changed.dispose();
  }
}

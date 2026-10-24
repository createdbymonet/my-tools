import { lstat, realpath } from 'node:fs/promises';
import * as path from 'node:path';
import type { Uri } from 'vscode';
import { isSafeRelativePath } from '../storage/serialization';
import { CACHE_DIRECTORY, LEGACY_METADATA_PATH, METADATA_PATH, isGeneratedPath } from './storagePaths';

type LocalFolder = Pick<Uri, 'scheme' | 'fsPath'>;

function isMissing(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}

/** Inspect descendants, allowing the workspace root itself to be a user-chosen link. */
async function rejectLinkedComponents(folder: LocalFolder, relativePath: string): Promise<void> {
  if (folder.scheme !== 'file') { return; }
  const components = relativePath.split('/');
  for (let index = 0; index < components.length; index++) {
    const relative = components.slice(0, index + 1);
    try {
      if ((await lstat(path.join(folder.fsPath, ...relative))).isSymbolicLink()) {
        throw new Error(`Refactor Marker cannot use a symbolic link or junction at ${relative.join('/')}. Use a regular path inside the workspace.`);
      }
    } catch (error: unknown) {
      // Descendants of a missing directory cannot exist yet; callers recheck after creation.
      if (isMissing(error)) { return; }
      throw error;
    }
  }
}

/** Refuse aliases that could redirect metadata or draft writes into source files. */
export async function requireSafeCacheDirectory(folder: LocalFolder): Promise<void> {
  await rejectLinkedComponents(folder, METADATA_PATH);
}

/** Inspect the legacy file only when migration actually needs to read it. */
export async function requireSafeLegacyMetadataPath(folder: LocalFolder): Promise<void> {
  await rejectLinkedComponents(folder, LEGACY_METADATA_PATH);
}

function isWithin(parent: string, candidate: string): boolean {
  const relative = path.relative(parent, candidate);
  return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`));
}

async function realpathIfPresent(filePath: string): Promise<string | undefined> {
  try { return await realpath(filePath); }
  catch (error: unknown) {
    if (isMissing(error)) { return undefined; }
    throw error;
  }
}

/** Source links are unsupported because marker identity uses workspace-relative paths. */
export async function requireSafeSourcePath(folder: LocalFolder, filePath: string): Promise<void> {
  if (!isSafeRelativePath(filePath) || isGeneratedPath(filePath)) {
    throw new Error(`Refactor Marker cannot use a generated or unsafe source path: ${filePath}.`);
  }
  if (folder.scheme !== 'file') { return; }
  await requireSafeCacheDirectory(folder);
  await rejectLinkedComponents(folder, filePath);
  const owningRoot = await realpath(folder.fsPath);
  const source = await realpath(path.join(folder.fsPath, ...filePath.split('/')));
  if (!isWithin(owningRoot, source)) {
    throw new Error(`The source path ${filePath} resolves outside its workspace folder.`);
  }
  const cache = path.join(owningRoot, ...CACHE_DIRECTORY.split('/'));
  const legacy = await realpathIfPresent(path.join(owningRoot, ...LEGACY_METADATA_PATH.split('/')));
  if (isWithin(cache, source) || (legacy !== undefined && isWithin(legacy, source))) {
    throw new Error(`Refactor Marker cannot use a source alias to generated cache files or legacy metadata: ${filePath}.`);
  }
}

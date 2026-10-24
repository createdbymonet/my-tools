/** Workspace-relative paths shared by persistence, commands, and draft export. */
export const CACHE_DIRECTORY = '.vscode/cache/refactor-marker';
export const METADATA_PATH = `${CACHE_DIRECTORY}/refactor-marker.json`;
export const LEGACY_METADATA_PATH = '.vscode/refactor-marker.json';

/** Generated drafts and metadata cannot become marker or export source inputs. */
export function isGeneratedPath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/gu, '/').toLowerCase();
  return normalized === LEGACY_METADATA_PATH
    || normalized === CACHE_DIRECTORY
    || normalized.startsWith(`${CACHE_DIRECTORY}/`);
}

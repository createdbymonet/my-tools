import { COLOR_DEFINITIONS } from '../decorations/colors';
import type { LocatedGroup } from '../storage/types';
import { uriKey } from '../utils/fileIdentity';
import { inclusiveEndLine } from '../utils/ranges';

export interface GroupPickItem {
  label: string;
  description?: string;
  detail: string;
  item: LocatedGroup;
}

/** Show each unique group path with its first source location and workspace. */
export function buildGroupPickItems(groups: readonly LocatedGroup[], showFolderName: boolean): GroupPickItem[] {
  const folderNames = new Map<string, Set<string>>();
  for (const { workspaceFolder } of groups) {
    const folderKey = uriKey(workspaceFolder.uri);
    const roots = folderNames.get(workspaceFolder.name) ?? new Set<string>();
    roots.add(folderKey);
    folderNames.set(workspaceFolder.name, roots);
  }
  return groups.map(item => {
    const { group, workspaceFolder } = item;
    const first = group.ranges[0];
    const duplicateFolderName = (folderNames.get(workspaceFolder.name)?.size ?? 0) > 1;
    const location = first
      ? `${first.filePath}: Lines ${first.startLine + 1}–${inclusiveEndLine(first) + 1}`
      : 'No ranges';
    return {
      label: group.name,
      description: showFolderName ? workspaceFolder.name : undefined,
      detail: [
        location,
        `${group.ranges.length} range${group.ranges.length === 1 ? '' : 's'}`,
        COLOR_DEFINITIONS[group.color].label,
        duplicateFolderName ? workspaceFolder.uri.fsPath : undefined,
      ].filter(Boolean).join(' · '),
      item,
    };
  });
}

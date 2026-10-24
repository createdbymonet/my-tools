import type { RefactorGroup, RefactorRange } from '../models/refactorGroup';
import { filePathKey } from '../utils/fileIdentity';

export function rangeIdentityKey(range: RefactorRange): string {
  return JSON.stringify([filePathKey(range.filePath), range.startLine, range.startCharacter, range.endLine, range.endCharacter]);
}

/** Merge only identical stored names; preserve file order and every range's array order. */
export function normalizeStoredGroups(
  groups: readonly RefactorGroup[], createdAtAvailable?: readonly boolean[],
): { groups: RefactorGroup[]; changed: boolean } {
  const normalized: RefactorGroup[] = [];
  const byName = new Map<string, { group: RefactorGroup; ranges: Set<string> }>();
  const useStoredOrder = new Set(groups.filter((_, index) => createdAtAvailable?.[index] === false).map(group => group.name));
  let changed = false;
  for (const input of groups) {
    let entry = byName.get(input.name);
    if (!entry) {
      entry = { group: { ...input, ranges: [] }, ranges: new Set() };
      byName.set(input.name, entry);
      normalized.push(entry.group);
    } else {
      changed = true;
      // Ties keep the first group in the file. Identity changes do not reorder ranges.
      if (!useStoredOrder.has(input.name) && Date.parse(input.createdAt) < Date.parse(entry.group.createdAt)) {
        entry.group.id = input.id;
        entry.group.color = input.color;
        entry.group.createdAt = input.createdAt;
      }
      if (Date.parse(input.updatedAt) > Date.parse(entry.group.updatedAt)) {
        entry.group.updatedAt = input.updatedAt;
      }
    }
    for (const range of input.ranges) {
      const key = rangeIdentityKey(range);
      if (entry.ranges.has(key)) {
        changed = true;
      } else {
        entry.ranges.add(key);
        entry.group.ranges.push({ ...range });
      }
    }
  }
  return { groups: normalized, changed };
}

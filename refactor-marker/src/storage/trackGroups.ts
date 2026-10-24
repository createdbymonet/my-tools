import type { RefactorGroup, RefactorRange } from '../models/refactorGroup';
import { trackRange, type TextChange } from '../tracking/rangeTracker';

interface TrackedGroups {
  groups: RefactorGroup[];
  changed: boolean;
  removed: boolean;
}

/** Track each affected range without discarding its group's other ranges or metadata. */
export function trackGroups(
  groups: readonly RefactorGroup[], changes: readonly TextChange[],
  matchesFile: (filePath: string) => boolean, updatedAt: string,
): TrackedGroups {
  let changed = false;
  let removed = false;
  const next = groups.map(group => {
    let groupChanged = false;
    const ranges: RefactorRange[] = [];
    for (const range of group.ranges) {
      if (!matchesFile(range.filePath)) {
        ranges.push(range);
        continue;
      }
      const tracked = trackRange(range, changes);
      if (tracked === null) {
        groupChanged = true;
        removed = true;
      } else if (tracked.startLine !== range.startLine || tracked.startCharacter !== range.startCharacter
        || tracked.endLine !== range.endLine || tracked.endCharacter !== range.endCharacter) {
        groupChanged = true;
        ranges.push({ ...range, ...tracked });
      } else {
        ranges.push(range);
      }
    }
    changed ||= groupChanged;
    return groupChanged ? { ...group, ranges, updatedAt } : group;
  });

  // Storage resolves conflicts together after every workspace root has tracked the event.
  return { groups: next, changed, removed };
}

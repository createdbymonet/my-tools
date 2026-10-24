import { MARKER_COLORS, MarkerColor, MarkerData, RefactorGroup, RefactorRange, SourceRange } from '../models/refactorGroup';
import { filePathKey } from '../utils/fileIdentity';
import { isNonEmptyRange, rangesOverlap } from '../utils/ranges';
import { isGeneratedPath } from '../utils/storagePaths';
import { normalizeStoredGroups, rangeIdentityKey } from './normalizeGroups';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Storage must never resolve outside its owning workspace folder. */
export function isSafeRelativePath(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
    && !/[\\:\u0000-\u001f\u007f]/u.test(value)
    && value.split('/').every(segment => segment.length > 0 && segment !== '.' && segment !== '..');
}

function isTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value;
}

function parseCoordinates(value: Record<string, unknown>): SourceRange {
  const coordinates = ['startLine', 'startCharacter', 'endLine', 'endCharacter'] as const;
  if (!coordinates.every(key => Number.isSafeInteger(value[key]) && (value[key] as number) >= 0)) {
    throw new Error('Invalid Refactor Marker range coordinates.');
  }
  const range: SourceRange = {
    startLine: value.startLine as number,
    startCharacter: value.startCharacter as number,
    endLine: value.endLine as number,
    endCharacter: value.endCharacter as number,
  };
  if (!isNonEmptyRange(range)) {
    throw new Error('Refactor Marker ranges must contain text.');
  }
  return range;
}

function parseRange(value: unknown): RefactorRange {
  if (!isRecord(value)
    || !isNonEmptyString(value.id)
    || !isSafeRelativePath(value.filePath)
    || isGeneratedPath(value.filePath)
    || !isTimestamp(value.addedAt)) {
    throw new Error('Invalid Refactor Marker range metadata.');
  }
  return { id: value.id, filePath: value.filePath, ...parseCoordinates(value), addedAt: value.addedAt };
}

function parseGroup(value: unknown, legacy: boolean, allowMissingTimestamps: boolean): RefactorGroup {
  if (!isRecord(value)
    || !isNonEmptyString(value.id)
    // New input validation belongs to commands. Stored legacy names remain readable.
    || !isNonEmptyString(value.name)
    || !MARKER_COLORS.includes(value.color as MarkerColor)
    || (!isTimestamp(value.createdAt) && !(allowMissingTimestamps && value.createdAt === undefined))
    || (!isTimestamp(value.updatedAt) && !(allowMissingTimestamps && value.updatedAt === undefined))) {
    throw new Error('Invalid Refactor Marker group metadata.');
  }
  const epoch = '1970-01-01T00:00:00.000Z';
  const createdAt = isTimestamp(value.createdAt) ? value.createdAt : undefined;
  const updatedAt = isTimestamp(value.updatedAt) ? value.updatedAt : undefined;
  let ranges: RefactorRange[];
  if (legacy) {
    ranges = [parseRange({ ...value, id: `${value.id}:legacy`, addedAt: createdAt ?? updatedAt ?? epoch })];
  } else {
    if (!Array.isArray(value.ranges)) {
      throw new Error('Invalid Refactor Marker group ranges.');
    }
    ranges = value.ranges.map(parseRange);
  }
  const addedAt = ranges.map(range => range.addedAt);
  const earliestAddedAt = addedAt.reduce((earliest, current) =>
    Date.parse(current) < Date.parse(earliest) ? current : earliest, addedAt[0] ?? epoch);
  const canonicalCreatedAt = createdAt ?? updatedAt ?? earliestAddedAt;
  const knownUpdates = [createdAt, ...addedAt].filter((timestamp): timestamp is string => timestamp !== undefined);
  const canonicalUpdatedAt = updatedAt ?? knownUpdates.reduce((latest, current) =>
    Date.parse(current) > Date.parse(latest) ? current : latest, knownUpdates[0] ?? canonicalCreatedAt);
  return {
    id: value.id,
    name: value.name,
    color: value.color as MarkerColor,
    ranges,
    createdAt: canonicalCreatedAt,
    updatedAt: canonicalUpdatedAt,
  };
}

interface StoredMarkerData { data: MarkerData; normalized: boolean }

function parseData(value: unknown, legacyOnly = false, normalize = false): StoredMarkerData {
  if (!isRecord(value) || (value.version !== 1 && value.version !== 2)
    || (legacyOnly && value.version !== 1) || !Array.isArray(value.groups)) {
    throw new Error('Unsupported Refactor Marker data format.');
  }
  const createdAtAvailable = value.groups.map(group => isRecord(group) && isTimestamp(group.createdAt));
  const timestampsMissing = value.groups.some(group => isRecord(group)
    && (group.createdAt === undefined || group.updatedAt === undefined));
  const parsed = value.groups.map(group => parseGroup(group, value.version === 1, normalize));
  if (normalize) {
    // Exact duplicates within one name may share an ID. An ID referring to
    // different code remains ambiguous even if another duplicate would be dropped.
    const originalGroupIds = new Map<string, string>();
    const originalRangeIds = new Map<string, { name: string; key: string }>();
    for (const group of parsed) {
      if (originalGroupIds.has(group.id) && originalGroupIds.get(group.id) !== group.name) {
        throw new Error('Duplicate Refactor Marker group ID across different names.');
      }
      originalGroupIds.set(group.id, group.name);
      for (const range of group.ranges) {
        const key = rangeIdentityKey(range);
        const previous = originalRangeIds.get(range.id);
        if (previous && (previous.name !== group.name || previous.key !== key)) {
          throw new Error('Duplicate Refactor Marker range ID refers to different groups or source ranges.');
        }
        originalRangeIds.set(range.id, { name: group.name, key });
      }
    }
  }
  const result = normalize ? normalizeStoredGroups(parsed, createdAtAvailable) : { groups: parsed, changed: false };
  const groups = result.groups;
  const groupIds = new Set<string>();
  const groupNames = new Set<string>();
  const rangeIds = new Set<string>();
  const rangesByFile = new Map<string, RefactorRange[]>();
  for (const group of groups) {
    if (groupIds.has(group.id)) {
      throw new Error('Duplicate Refactor Marker group ID.');
    }
    groupIds.add(group.id);
    if (groupNames.has(group.name)) {
      throw new Error('Duplicate Refactor Marker group name.');
    }
    groupNames.add(group.name);
    for (const range of group.ranges) {
      if (rangeIds.has(range.id)) {
        throw new Error('Duplicate Refactor Marker range ID.');
      }
      rangeIds.add(range.id);
      const key = filePathKey(range.filePath);
      const fileRanges = rangesByFile.get(key) ?? [];
      if (fileRanges.some(existing => rangesOverlap(existing, range))) {
        throw new Error('Overlapping Refactor Marker ranges.');
      }
      fileRanges.push(range);
      rangesByFile.set(key, fileRanges);
    }
  }
  return { data: { version: 2, groups }, normalized: result.changed || (normalize && timestampsMissing) };
}

/** Validate the complete file before exposing any of its groups to the UI. */
export function deserializeMarkerData(text: string): MarkerData {
  return deserializeMarkerDataWithNormalization(text).data;
}

export function deserializeMarkerDataWithNormalization(text: string): StoredMarkerData {
  return parseData(JSON.parse(text), false, true);
}

/** The old location must contain the actual v0.1 schema before it can migrate. */
export function deserializeLegacyMarkerData(text: string): MarkerData {
  return parseData(JSON.parse(text), true, true).data;
}

export function serializeMarkerData(groups: readonly RefactorGroup[]): string {
  // Live mutations must reject duplicate selections rather than silently deduplicate.
  const validated = parseData({ version: 2, groups }).data;
  return `${JSON.stringify(validated, undefined, 2)}\n`;
}

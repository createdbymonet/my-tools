import { SourcePosition, SourceRange } from '../models/refactorGroup';
import { comparePositions, isNonEmptyRange, rangeEnd, rangeStart } from '../utils/ranges';

export interface TextChange {
  range: { start: SourcePosition; end: SourcePosition };
  text: string;
}

function insertedEnd(change: TextChange): SourcePosition {
  const lines = change.text.split(/\r\n|\r|\n/u);
  return lines.length === 1
    ? { line: change.range.start.line, character: change.range.start.character + change.text.length }
    : { line: change.range.start.line + lines.length - 1, character: lines[lines.length - 1].length };
}

function mapPosition(position: SourcePosition, change: TextChange, affinity: 'left' | 'right'): SourcePosition {
  const { start, end } = change.range;
  const beforeStart = comparePositions(position, start);
  const afterEnd = comparePositions(position, end);
  if (beforeStart < 0) {
    return position;
  }

  const replacementEnd = insertedEnd(change);
  const isInsertion = comparePositions(start, end) === 0;
  if (isInsertion && beforeStart === 0) {
    return affinity === 'right' ? replacementEnd : start;
  }
  if (beforeStart === 0) {
    return start;
  }
  if (!isInsertion && afterEnd < 0) {
    // Keep replacement text inside a marker when its former contents are replaced.
    return affinity === 'right' ? start : replacementEnd;
  }
  return position.line === end.line
    ? { line: replacementEnd.line, character: replacementEnd.character + position.character - end.character }
    : { line: position.line + replacementEnd.line - end.line, character: position.character };
}

/**
 * Changes use coordinates from the pre-edit document, as VS Code provides them.
 * Applying from bottom to top keeps those coordinates valid. Insertions exactly
 * at either boundary stay outside the group; replacements inside it stay inside.
 * A complete deletion or nonempty replacement crossing either boundary removes
 * the marker because its original boundaries cannot be recovered reliably. Exact
 * replacements remain marked. Start columns are normalized because decorations
 * represent whole lines, and the final endpoint stays exclusive.
 */
export function trackRange(range: SourceRange, changes: readonly TextChange[]): SourceRange | null {
  let start = rangeStart(range);
  let end = rangeEnd(range);
  const ordered = [...changes].sort((a, b) => comparePositions(b.range.start, a.range.start)
    || comparePositions(b.range.end, a.range.end));

  for (const change of ordered) {
    const startComparison = comparePositions(change.range.start, start);
    const endComparison = comparePositions(change.range.end, end);
    if (change.text.length > 0 && (
      (startComparison < 0 && comparePositions(change.range.end, start) > 0)
      || (comparePositions(change.range.start, end) < 0 && endComparison > 0)
    )) {
      // A replacement crossing a boundary mixes marked and unrelated code.
      // Its replacement text cannot safely be attributed to either side.
      return null;
    }
    if (startComparison <= 0 && endComparison >= 0
      && (change.text.length === 0 || startComparison < 0 || endComparison > 0)) {
      return null;
    }
    start = mapPosition(start, change, 'right');
    end = mapPosition(end, change, 'left');
    if (comparePositions(start, end) >= 0) {
      return null;
    }
  }

  const tracked = {
    startLine: start.line,
    startCharacter: 0,
    endLine: end.line,
    endCharacter: end.character,
  };
  return isNonEmptyRange(tracked) ? tracked : null;
}

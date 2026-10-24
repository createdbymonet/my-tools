import { SourcePosition, SourceRange } from '../models/refactorGroup';

export function comparePositions(a: SourcePosition, b: SourcePosition): number {
  return a.line - b.line || a.character - b.character;
}

export function rangeStart(range: SourceRange): SourcePosition {
  return { line: range.startLine, character: range.startCharacter };
}

export function rangeEnd(range: SourceRange): SourcePosition {
  return { line: range.endLine, character: range.endCharacter };
}

export function isNonEmptyRange(range: SourceRange): boolean {
  return comparePositions(rangeStart(range), rangeEnd(range)) < 0;
}

/** VS Code selections ending at column zero exclude that final line. */
export function inclusiveEndLine(range: SourceRange): number {
  return range.endCharacter === 0 && range.endLine > range.startLine
    ? range.endLine - 1
    : range.endLine;
}

/** Mark entire lines, while retaining the selection's exclusive end position. */
export function selectionToRange(start: SourcePosition, end: SourcePosition): SourceRange {
  const [first, last] = comparePositions(start, end) <= 0 ? [start, end] : [end, start];
  return {
    startLine: first.line,
    startCharacter: comparePositions(first, last) === 0 ? first.character : 0,
    endLine: last.line,
    endCharacter: last.character,
  };
}

/** Adjacent character selections on the same line still conflict visually. */
export function rangesOverlap(a: SourceRange, b: SourceRange): boolean {
  return isNonEmptyRange(a) && isNonEmptyRange(b)
    && a.startLine <= inclusiveEndLine(b)
    && b.startLine <= inclusiveEndLine(a);
}

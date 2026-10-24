export const MARKER_COLORS = ['blue', 'green', 'yellow', 'purple', 'red', 'orange', 'gray'] as const;
export type MarkerColor = typeof MARKER_COLORS[number];

export interface SourcePosition { line: number; character: number }
export interface SourceRange { startLine: number; startCharacter: number; endLine: number; endCharacter: number }

export interface RefactorRange extends SourceRange {
  id: string;
  filePath: string;
  addedAt: string;
}

export interface RefactorGroup {
  id: string;
  name: string;
  color: MarkerColor;
  ranges: RefactorRange[];
  createdAt: string;
  updatedAt: string;
}

export interface MarkerData { version: 2; groups: RefactorGroup[] }

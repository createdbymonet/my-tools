import { MARKER_COLORS, type MarkerColor } from '../models/refactorGroup';

export interface MarkerColorDefinition {
  label: string;
  background: string;
  themeColor: string;
}

/** Keep the editor palette and native UI color labels together. */
export const COLOR_DEFINITIONS: Readonly<Record<MarkerColor, MarkerColorDefinition>> = {
  blue: { label: 'Blue', background: 'rgba(70, 140, 230, 0.30)', themeColor: 'charts.blue' },
  green: { label: 'Green', background: 'rgba(70, 170, 100, 0.30)', themeColor: 'charts.green' },
  yellow: { label: 'Yellow', background: 'rgba(220, 190, 60, 0.30)', themeColor: 'charts.yellow' },
  purple: { label: 'Purple', background: 'rgba(160, 100, 210, 0.30)', themeColor: 'charts.purple' },
  red: { label: 'Red', background: 'rgba(220, 80, 80, 0.30)', themeColor: 'charts.red' },
  // charts.orange can be blue in high-contrast light themes; use our registered orange token.
  orange: { label: 'Orange', background: 'rgba(230, 145, 55, 0.30)', themeColor: 'refactorMarker.orangeIcon' },
  gray: { label: 'Gray', background: 'rgba(140, 140, 140, 0.30)', themeColor: 'descriptionForeground' }
};

export { MARKER_COLORS };

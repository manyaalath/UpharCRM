// Date-range presets for the overview. Plain module so the server page can read it.
export const RANGES = [
  { key: '7d', label: '7 days', days: 7 },
  { key: '30d', label: '30 days', days: 30 },
  { key: '90d', label: '90 days', days: 90 },
  { key: 'all', label: 'All time', days: null },
] as const;
export type RangeKey = (typeof RANGES)[number]['key'];

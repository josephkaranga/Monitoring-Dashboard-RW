/** Green ≥70 · Amber 40–69 · Red <40 */
export function progressColor(p: number): {
  color: string;
  bg: string;
  border: string;
  label: string;
} {
  if (p >= 70) return { color: '#16a34a', bg: '#dcfce7', border: '#bbf7d0', label: 'On Track' };
  if (p >= 40) return { color: '#d97706', bg: '#fef3c7', border: '#fde68a', label: 'At Risk' };
  return { color: '#dc2626', bg: '#fee2e2', border: '#fecaca', label: 'Behind' };
}

/** Single hex string for inline styles */
export function progressHex(p: number): string {
  if (p >= 70) return '#16a34a';
  if (p >= 40) return '#d97706';
  return '#dc2626';
}

/** Progress status string aligned to indicator status field */
export function progressStatus(p: number): 'on-track' | 'at-risk' | 'behind' {
  if (p >= 70) return 'on-track';
  if (p >= 40) return 'at-risk';
  return 'behind';
}

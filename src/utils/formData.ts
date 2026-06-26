/**
 * Single render layer for form_data values across the entire app.
 * Every page that displays form_data should use these functions
 * instead of raw String(val) or manual key formatting.
 */

export function formatFieldLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

export function formatFieldValue(val: unknown): string {
  if (val === null || val === undefined || val === '') return '—';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'number') return val.toLocaleString();
  if (typeof val === 'string') return val;
  if (Array.isArray(val)) return val.map(formatFieldValue).join(', ');
  if (typeof val === 'object') {
    const entries = Object.entries(val as Record<string, unknown>);
    if (entries.length === 0) return '—';
    return entries
      .map(([k, v]) => `${formatFieldLabel(k)}: ${formatFieldValue(v)}`)
      .join(' · ');
  }
  return String(val);
}

export function flattenFormData(
  data: Record<string, unknown>
): Array<{ key: string; label: string; value: string }> {
  const result: Array<{ key: string; label: string; value: string }> = [];

  for (const [key, val] of Object.entries(data)) {
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      const parentLabel = formatFieldLabel(key);
      for (const [subKey, subVal] of Object.entries(val as Record<string, unknown>)) {
        result.push({
          key: `${key}.${subKey}`,
          label: `${parentLabel} — ${formatFieldLabel(subKey)}`,
          value: formatFieldValue(subVal),
        });
      }
    } else {
      result.push({
        key,
        label: formatFieldLabel(key),
        value: formatFieldValue(val),
      });
    }
  }

  return result;
}

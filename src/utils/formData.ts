/**
 * Single render layer for form_data values across the entire app.
 *
 * Three rendering strategies for three contexts:
 *   formatFieldValue  → inline/compact (one line per value)
 *   flattenFormData   → tables/CSV (one row per value, parent-prefixed)
 *   groupedFormData   → detail views (sectioned, ordered, labeled)
 *
 * Display metadata comes from fieldRegistry.ts (loose string-key coupling).
 * formatFieldLabel is the fallback when the registry has no entry.
 */

import { lookupField, sectionSortIndex } from './fieldRegistry';
import type { FieldMeta } from './fieldRegistry';

// ── 1. Label fallback (no registry) ─────────────────────────
export function formatFieldLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

// ── 2. Value formatting ─────────────────────────────────────
export function formatFieldValue(val: unknown, format?: FieldMeta['format']): string {
  if (val === null || val === undefined || val === '') return '—';
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  if (typeof val === 'number') {
    if (format === 'currency') return `${val.toLocaleString()} RWF`;
    if (format === 'percent') return `${val}%`;
    return val.toLocaleString();
  }
  if (typeof val === 'string') {
    if (format === 'currency') {
      const n = Number(val);
      if (!isNaN(n)) return `${n.toLocaleString()} RWF`;
    }
    if (format === 'percent') {
      const n = Number(val);
      if (!isNaN(n)) return `${n}%`;
    }
    return val;
  }
  if (Array.isArray(val)) return val.map(v => formatFieldValue(v)).join(', ');
  if (typeof val === 'object') {
    const entries = Object.entries(val as Record<string, unknown>);
    if (entries.length === 0) return '—';
    return entries
      .map(([k, v]) => {
        const meta = lookupField(k);
        return `${meta.label}: ${formatFieldValue(v, meta.format)}`;
      })
      .join(' · ');
  }
  return String(val);
}

// ── 3. Flat list (tables, CSV) ──────────────────────────────
export function flattenFormData(
  data: Record<string, unknown>
): Array<{ key: string; label: string; value: string }> {
  const result: Array<{ key: string; label: string; value: string }> = [];

  for (const [key, val] of Object.entries(data)) {
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      const parentMeta = lookupField(key);
      for (const [subKey, subVal] of Object.entries(val as Record<string, unknown>)) {
        const childMeta = lookupField(subKey);
        result.push({
          key: `${key}.${subKey}`,
          label: `${parentMeta.label} — ${childMeta.label}`,
          value: formatFieldValue(subVal, childMeta.format),
        });
      }
    } else {
      const meta = lookupField(key);
      result.push({
        key,
        label: meta.label,
        value: formatFieldValue(val, meta.format),
      });
    }
  }

  return result;
}

// ── 4. Grouped sections (detail views) ──────────────────────
export interface FormSection {
  id: string;
  label: string;
  fields: Array<{ key: string; label: string; value: string }>;
}

export function groupedFormData(
  data: Record<string, unknown>
): FormSection[] {
  const sections = new Map<string, FormSection>();

  function ensureSection(sectionLabel: string): FormSection {
    let sec = sections.get(sectionLabel);
    if (!sec) {
      sec = { id: sectionLabel.toLowerCase().replace(/\s+/g, '-'), label: sectionLabel, fields: [] };
      sections.set(sectionLabel, sec);
    }
    return sec;
  }

  for (const [key, val] of Object.entries(data)) {
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      // Nested object → try to place children individually;
      // if none are known, group under parent label
      const parentMeta = lookupField(key);
      const childEntries = Object.entries(val as Record<string, unknown>);
      const anyChildKnown = childEntries.some(([ck]) => lookupField(ck).section !== 'Other');

      for (const [subKey, subVal] of childEntries) {
        const childMeta = lookupField(subKey);
        const sectionLabel = anyChildKnown ? childMeta.section : parentMeta.section;
        const label = anyChildKnown ? childMeta.label : `${parentMeta.label} — ${childMeta.label}`;
        ensureSection(sectionLabel).fields.push({
          key: `${key}.${subKey}`,
          label,
          value: formatFieldValue(subVal, childMeta.format),
        });
      }
    } else {
      const meta = lookupField(key);
      ensureSection(meta.section).fields.push({
        key,
        label: meta.label,
        value: formatFieldValue(val, meta.format),
      });
    }
  }

  // Sort sections by defined order, "Other" last
  return [...sections.values()]
    .filter(s => s.fields.length > 0)
    .sort((a, b) => sectionSortIndex(a.label) - sectionSortIndex(b.label));
}

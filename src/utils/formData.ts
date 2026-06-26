/**
 * Render layer for form_data values.
 *
 * Responsibilities are strictly separated:
 *   Registry   → defines meaning (section, label, format declaration)
 *   Formatter  → defines presentation (how a value looks on screen)
 *   Data       → defines nothing beyond keys and values
 *
 * No layer reinterprets another layer's responsibility.
 *
 * Three rendering strategies:
 *   formatFieldValue   → type coercion only (unknown → string)
 *   applyDisplayFormat → presentation only (string → decorated string)
 *   flattenFormData    → tables/CSV (one row per value, parent-prefixed)
 *   groupedFormData    → detail views (sectioned, ordered, labeled)
 */

import { lookupField, sectionSortIndex } from './fieldRegistry';
import type { FieldMeta } from './fieldRegistry';

// ── Label fallback (no registry) ────────────────────────────
export function formatFieldLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

// ── Value coercion (type → string, nothing else) ────────────
// Converts any JS type to a human-readable string.
// Does NOT apply formatting (currency, percent, etc.).
// Does NOT consult the registry.
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

// ── Display formatting (presentation only) ──────────────────
// Takes an already-coerced string value and applies the format
// declared by the registry. Separate from coercion so the
// formatter never decides what a value IS, only how it LOOKS.
export function applyDisplayFormat(
  coercedValue: string,
  format: FieldMeta['format'] | undefined
): string {
  if (!format || format === 'text' || coercedValue === '—') return coercedValue;

  const num = Number(coercedValue.replace(/,/g, ''));

  if (format === 'currency') {
    return isNaN(num) ? coercedValue : `${num.toLocaleString()} RWF`;
  }
  if (format === 'percent') {
    return isNaN(num) ? coercedValue : `${num}%`;
  }
  if (format === 'number') {
    return isNaN(num) ? coercedValue : num.toLocaleString();
  }

  return coercedValue;
}

// ── Resolve a single field: coerce then format ──────────────
function resolveField(key: string, val: unknown): { label: string; value: string; section: string } {
  const meta = lookupField(key);
  const coerced = formatFieldValue(val);
  const formatted = applyDisplayFormat(coerced, meta.format);
  return { label: meta.label, value: formatted, section: meta.section };
}

// ── Flat list (tables, CSV) ─────────────────────────────────
export function flattenFormData(
  data: Record<string, unknown>
): Array<{ key: string; label: string; value: string }> {
  const result: Array<{ key: string; label: string; value: string }> = [];

  for (const [key, val] of Object.entries(data)) {
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      const parent = lookupField(key);
      for (const [subKey, subVal] of Object.entries(val as Record<string, unknown>)) {
        const child = resolveField(subKey, subVal);
        result.push({
          key: `${key}.${subKey}`,
          label: `${parent.label} — ${child.label}`,
          value: child.value,
        });
      }
    } else {
      const resolved = resolveField(key, val);
      result.push({ key, label: resolved.label, value: resolved.value });
    }
  }

  return result;
}

// ── Grouped sections (detail views) ─────────────────────────
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
      const parent = lookupField(key);
      const childEntries = Object.entries(val as Record<string, unknown>);
      const anyChildKnown = childEntries.some(([ck]) => lookupField(ck).section !== 'Other');

      for (const [subKey, subVal] of childEntries) {
        const child = resolveField(subKey, subVal);
        const sectionLabel = anyChildKnown ? child.section : parent.section;
        const label = anyChildKnown ? child.label : `${parent.label} — ${child.label}`;
        ensureSection(sectionLabel).fields.push({
          key: `${key}.${subKey}`,
          label,
          value: child.value,
        });
      }
    } else {
      const resolved = resolveField(key, val);
      ensureSection(resolved.section).fields.push({
        key,
        label: resolved.label,
        value: resolved.value,
      });
    }
  }

  return [...sections.values()]
    .filter(s => s.fields.length > 0)
    .sort((a, b) => sectionSortIndex(a.label) - sectionSortIndex(b.label));
}

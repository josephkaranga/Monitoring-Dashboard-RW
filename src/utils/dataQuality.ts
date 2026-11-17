// M04 — helpers for the data-quality checklist and flags. The database
// (migration 043) makes the decisions; these only mirror them in the form
// so the user sees the state before submitting.
import type { DqaChecklistItem, DqaDeclaration, QualityFlag } from '../types/index';

/** Same rule as dqa_checklist_complete(): declared, and every active item confirmed. */
export function isChecklistComplete(
  items: DqaChecklistItem[],
  declaration: DqaDeclaration
): boolean {
  if (!declaration.declared) return false;
  const confirmed = new Set(declaration.items);
  return items.filter(i => i.is_active).every(i => confirmed.has(i.id));
}

export function emptyDeclaration(): DqaDeclaration {
  return { declared: false, items: [] };
}

/** Only what the database expects from the browser (author and time are set there). */
export function declarationPayload(declaration: DqaDeclaration): DqaDeclaration {
  return { declared: declaration.declared, items: [...declaration.items].sort((a, b) => a - b) };
}

export function qualityErrors(flags: QualityFlag[] | null | undefined): QualityFlag[] {
  return (flags ?? []).filter(f => f.severity === 'error');
}

export function qualityWarnings(flags: QualityFlag[] | null | undefined): QualityFlag[] {
  return (flags ?? []).filter(f => f.severity === 'warning');
}

/** Warnings a validator should look at (jumps first). */
export function validatorAttention(flags: QualityFlag[] | null | undefined): QualityFlag[] {
  return qualityWarnings(flags).sort(
    (a, b) => Number(b.code === 'jump') - Number(a.code === 'jump')
  );
}

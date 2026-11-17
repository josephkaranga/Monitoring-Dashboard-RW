// ============================================================
// M05 — Indicator reference data (migration 045)
// Reads v_indicator_reference (everything a reference sheet shows,
// with the missing fields). Administrators edit the reference fields;
// the database refuses to approve incomplete data and returns approved
// data to draft when it changes.
// ============================================================

import { supabase } from '../utils/supabase';
import type {
  DisaggregationDimension,
  IndicatorReference,
  IndicatorReferenceEdit,
  NationalTier,
} from '../types/index';

export async function fetchIndicatorReferences(): Promise<IndicatorReference[]> {
  const { data, error } = await supabase
    .from('v_indicator_reference')
    .select('*')
    .order('nbsap_target_id')
    .order('id');
  if (error) throw new Error(`Could not load indicator reference data: ${error.message}`);
  return (data || []) as IndicatorReference[];
}

export async function fetchIndicatorReference(id: number): Promise<IndicatorReference> {
  const { data, error } = await supabase
    .from('v_indicator_reference')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw new Error(`Could not load the reference sheet: ${error.message}`);
  return data as IndicatorReference;
}

export async function fetchDisaggregationDimensions(): Promise<DisaggregationDimension[]> {
  const { data, error } = await supabase
    .from('disaggregation_dimensions')
    .select('code, label, description, fields, ordinal')
    .order('ordinal')
    .order('code');
  if (error) throw new Error(`Could not load disaggregation dimensions: ${error.message}`);
  return (data || []) as DisaggregationDimension[];
}

export async function fetchNationalTiers(): Promise<NationalTier[]> {
  const { data, error } = await supabase
    .from('national_tiers')
    .select('tier, name, description')
    .order('tier');
  if (error) throw new Error(`Could not load national tiers: ${error.message}`);
  return (data || []) as NationalTier[];
}

/** The breakdowns a report on this indicator must give. */
export async function fetchIndicatorDisaggregations(indicatorId: number): Promise<string[]> {
  const { data, error } = await supabase
    .from('indicators')
    .select('disaggregations')
    .eq('id', indicatorId)
    .single();
  if (error) throw new Error(error.message);
  return ((data as { disaggregations: string[] | null })?.disaggregations ?? []) as string[];
}

/** REMA administrators only (RLS). */
export async function updateIndicatorReference(
  id: number,
  changes: IndicatorReferenceEdit
): Promise<{ error: string | null }> {
  const { error, count } = await supabase
    .from('indicators')
    .update(changes, { count: 'exact' })
    .eq('id', id);
  if (error) return { error: error.message };
  if (count === 0) return { error: 'Only REMA administrators can change reference data.' };
  return { error: null };
}

-- ============================================================
-- Migration: 044_four_reporting_modules.sql
-- REMA reports through four modules (confirmed 17 Nov 2026):
--   T01 National Institutional Reporting   weight 0.40
--   T02 District Biodiversity Monitoring   weight 0.35
--   T03 Private Sector Compliance          weight 0.15
--   T04 Research & Academic Contribution   weight 0.10
-- The production database was consolidated in June 2026 (report_type
-- T01-T04 plus T03/T04/T05_LEGACY; tool_weights as above; system
-- metrics read EIA compliance from T03). This migration brings the rest
-- in line:
--   1. institutions.tool_ids: seeded by 039 in the old seven-module
--      numbering. Old T06 (private sector) -> T03, old T07 (research)
--      -> T04, retired modules (old T03 protected areas, T04 community,
--      T05 finance) dropped. An institution left without a module gets
--      T03 (private sector), T04 (academia and research) or T01 (all
--      others). REMA can correct any institution afterwards.
--   2. dqa_field_rules (043): rules follow the new T03/T04 forms.
--   3. tool_weights: the four weights above (production already has
--      them; databases built from the migrations do not).
-- Re-running is harmless: step 1 only runs while old codes T05-T07 are
-- still present.
-- ============================================================

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.dqa_field_rules') IS NULL THEN
    RAISE EXCEPTION 'Migration 044 needs 043 (data quality). Apply 037-043 first.';
  END IF;
END $$;

-- ── 1. Institutions: old module numbers -> the four modules ──
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.institutions WHERE tool_ids && ARRAY['T05', 'T06', 'T07']) THEN
    UPDATE public.institutions i
    SET tool_ids = CASE
          WHEN cardinality(m.ids) > 0 THEN m.ids
          WHEN i.category = 'Private sector' THEN ARRAY['T03']
          WHEN i.category = 'Academia and research' THEN ARRAY['T04']
          ELSE ARRAY['T01']
        END
    FROM (
      SELECT x.id,
             ARRAY(
               SELECT DISTINCT CASE t WHEN 'T01' THEN 'T01' WHEN 'T02' THEN 'T02'
                                      WHEN 'T06' THEN 'T03' WHEN 'T07' THEN 'T04' END AS n
               FROM unnest(x.tool_ids) AS t
               WHERE t IN ('T01', 'T02', 'T06', 'T07')
               ORDER BY 1
             ) AS ids
      FROM public.institutions x
    ) m
    WHERE m.id = i.id;
  END IF;
END $$;

-- ── 2. Data-quality rules for the new T03 and T04 forms ──
DELETE FROM public.dqa_field_rules WHERE tool_id NOT IN ('T01', 'T02', 'T03', 'T04');
DELETE FROM public.dqa_field_rules
WHERE tool_id IN ('T03', 'T04')
  AND field_key IN ('coverage_change_ha', 'habitat_quality', 'illegal_cases',
                    'hwc_incidents', 'tree_planting_hh');

INSERT INTO public.dqa_field_rules (tool_id, field_key, label, unit, min_value, max_value, compare_jump) VALUES
  ('T03', 'restoration_ha', 'Restoration Commitments', 'ha',          0, 2633800, TRUE),
  ('T03', 'esg_score',      'ESG Biodiversity Score',  'score 1-100', 1, 100,     TRUE)
ON CONFLICT (tool_id, field_key) DO UPDATE
  SET label = EXCLUDED.label, unit = EXCLUDED.unit,
      min_value = EXCLUDED.min_value, max_value = EXCLUDED.max_value;
-- T04 (research) has no numeric fields: only the period and checklist apply.

-- ── 3. Tool weights ──
INSERT INTO public.tool_weights (tool_id, weight, description, active) VALUES
  ('T01', 0.400, 'National Institutional Reporting', TRUE),
  ('T02', 0.350, 'District Biodiversity Monitoring', TRUE),
  ('T03', 0.150, 'Private Sector Compliance', TRUE),
  ('T04', 0.100, 'Research & Academic Contribution', TRUE)
ON CONFLICT (tool_id) DO UPDATE
  SET weight = EXCLUDED.weight, description = EXCLUDED.description, active = TRUE, updated_at = NOW();
UPDATE public.tool_weights SET active = FALSE, updated_at = NOW()
WHERE tool_id NOT IN ('T01', 'T02', 'T03', 'T04') AND active;

INSERT INTO public.audit_log (user_id, action_type, action, detail, role, source)
VALUES (NULL, 'schema_migration', 'Four reporting modules (044)',
        'Institutions, data-quality rules and tool weights follow T01 Institutional, T02 District, T03 Private Sector, T04 Research.',
        'system', 'database');

COMMIT;

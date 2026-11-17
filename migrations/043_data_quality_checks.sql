-- ============================================================
-- M04 — DATA QUALITY CHECKS AND DQA CHECKLIST
-- Migration: 043_data_quality_checks.sql
-- Source: "NBSAP Monitoring System: status and development
--          requirements" (4 Nov 2026), module M04.
--
-- Done when (PDF): a 50% jump is flagged to the validator. Submission
-- is blocked until the checklist is complete.
--
--   1. dqa_field_rules: per tool and field, the allowed range and unit,
--      and whether the value is compared with the previous report.
--      dqa_settings: the jump threshold (0.5 = 50%).
--   2. assess_report_quality(): one function used on submission, on
--      resubmission and for the form's live preview. Two severities:
--        error   -> submission refused (impossible values: out of range,
--                   negative, disbursed > allocated, invalid or future
--                   period)
--        warning -> recorded on the report and shown to validators
--                   (jump against the previous published report, no
--                   indicator linked, no target linked)
--   3. dqa_checklist_items + toolkit_reports.dqa_declaration: every
--      active item must be confirmed, and the declaration accepted,
--      before a report is submitted or resubmitted.
-- Rules, threshold and checklist are data that REMA administrators
-- maintain; nothing is hard-coded in the screens.
-- ============================================================

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.report_drafts') IS NULL THEN
    RAISE EXCEPTION 'Migration 043 needs 042 (drafts). Apply 037-042 first.';
  END IF;
END $$;

-- ============================================================
-- 1. RULES AND SETTINGS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.dqa_settings (
  key        TEXT PRIMARY KEY,
  value      NUMERIC NOT NULL,
  note       TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.dqa_settings (key, value, note) VALUES
  ('jump_threshold', 0.5, 'Flag a value that changed by this fraction or more since the previous published report (0.5 = 50%).')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.dqa_field_rules (
  id           SERIAL PRIMARY KEY,
  tool_id      report_type NOT NULL,
  field_key    TEXT NOT NULL,
  label        TEXT NOT NULL,
  unit         TEXT,
  min_value    NUMERIC,
  max_value    NUMERIC,
  compare_jump BOOLEAN NOT NULL DEFAULT TRUE,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (tool_id, field_key)
);

COMMENT ON TABLE public.dqa_field_rules IS
'M04: range, unit and jump rules per tool field. Ranges come from the form labels (e.g. Habitat Quality 1-10); hectares are capped at Rwanda''s land area (2,633,800 ha).';

-- Rwanda: 26,338 km2 = 2,633,800 ha.
INSERT INTO public.dqa_field_rules (tool_id, field_key, label, unit, min_value, max_value, compare_jump) VALUES
  ('T01', 'reported_value',      'Reported Value',                     NULL,        0, NULL,    TRUE),
  ('T01', 'budget_utilized',     'Budget Utilized',                    'RWF',       0, NULL,    TRUE),
  ('T02', 'forest_ha',           'Forest Restoration',                 'ha',        0, 2633800, TRUE),
  ('T02', 'wetland_ha',          'Wetland Rehabilitation',             'ha',        0, 2633800, TRUE),
  ('T02', 'agroforestry_hh',     'Agroforestry Households',            'households',0, NULL,    TRUE),
  ('T02', 'soil_structures',     'Soil Conservation Structures',       'structures',0, NULL,    TRUE),
  ('T02', 'conservation_groups', 'Conservation Groups',                'groups',    0, NULL,    TRUE),
  ('T02', 'illegal_cases',       'Illegal Activities Reported',        'cases',     0, NULL,    TRUE),
  ('T03', 'coverage_change_ha',  'Coverage Change',                    'ha',        NULL, 2633800, TRUE),
  ('T03', 'habitat_quality',     'Habitat Quality',                    'score 1-10',1, 10,      TRUE),
  ('T03', 'illegal_cases',       'Illegal Activities Detected',        'cases',     0, NULL,    TRUE),
  ('T03', 'restoration_ha',      'Restoration Activities',             'ha',        0, 2633800, TRUE),
  ('T04', 'hwc_incidents',       'Human-Wildlife Conflict Incidents',  'incidents', 0, NULL,    TRUE),
  ('T04', 'tree_planting_hh',    'Tree Planting Households',           'households',0, NULL,    TRUE),
  ('T05', 'budget_allocated',    'Budget Allocated',                   'RWF',       0, NULL,    TRUE),
  ('T05', 'budget_disbursed',    'Budget Disbursed',                   'RWF',       0, NULL,    TRUE),
  ('T05', 'implementation_pct',  'Implementation Status',              '%',         0, 100,     TRUE),
  ('T06', 'restoration_ha',      'Restoration Commitments',            'ha',        0, 2633800, TRUE),
  ('T06', 'esg_score',           'ESG Biodiversity Score',             'score 1-100',1, 100,    TRUE)
ON CONFLICT (tool_id, field_key) DO NOTHING;

-- ============================================================
-- 2. CHECKLIST
-- ============================================================

CREATE TABLE IF NOT EXISTS public.dqa_checklist_items (
  id        SERIAL PRIMARY KEY,
  ordinal   INTEGER NOT NULL,
  text      TEXT NOT NULL,
  source    TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

COMMENT ON TABLE public.dqa_checklist_items IS
'M04: the submitter''s self-check before submission. Items follow the "Key Standards for Data Quality" in the NBSAP II Monitoring Framework (April 2026), section 2.5.3.6. "Maintenance" is a system duty, not a submitter check, so it is not listed. REMA can edit, add or deactivate items.';

-- Seeded once; afterwards the list belongs to REMA administrators.
INSERT INTO public.dqa_checklist_items (ordinal, text, source)
SELECT v.ordinal, v.text, v.source
FROM (VALUES
  (1, 'Accuracy: I checked every figure against the source records and corrected entry errors.',
      'Monitoring Framework (Apr 2026) 2.5.3.6 - Accuracy'),
  (2, 'Completeness: all essential information is filled in; any gap is explained in the notes.',
      'Monitoring Framework (Apr 2026) 2.5.3.6 - Completeness'),
  (3, 'Consistency: the figures were collected and calculated with the same method as the previous report, or the change of method is explained.',
      'Monitoring Framework (Apr 2026) 2.5.3.6 - Consistency and Reliability'),
  (4, 'Timeliness: the figures describe the reporting period selected, not another period.',
      'Monitoring Framework (Apr 2026) 2.5.3.6 - Timeliness'),
  (5, 'Relevance: the figures measure the selected NBSAP target and indicator.',
      'Monitoring Framework (Apr 2026) 2.5.3.6 - Relevance/Validity'),
  (6, 'Uniqueness: these results have not already been reported in another report (no double counting).',
      'Monitoring Framework (Apr 2026) 2.5.3.6 - Uniqueness'),
  (7, 'Format: values use the units the form asks for (hectares, RWF, counts, percentages).',
      'Monitoring Framework (Apr 2026) 2.5.3.6 - Format Standardization'),
  (8, 'Traceability: the source of each figure is documented and the supporting evidence is attached or referenced.',
      'Monitoring Framework (Apr 2026) 2.5.3.6 - Traceability')
) AS v(ordinal, text, source)
WHERE NOT EXISTS (SELECT 1 FROM public.dqa_checklist_items);

ALTER TABLE public.toolkit_reports
  ADD COLUMN IF NOT EXISTS quality_flags   JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS dqa_declaration JSONB;

COMMENT ON COLUMN public.toolkit_reports.quality_flags IS
'M04: warnings found on submission (e.g. a jump of 50% or more since the previous published report), shown to validators.';
COMMENT ON COLUMN public.toolkit_reports.dqa_declaration IS
'M04: the submitter''s confirmation of each checklist item and the declaration, with time and author (set by the database).';

-- ── Access: everyone signed in reads; administrators maintain ──
ALTER TABLE public.dqa_settings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dqa_field_rules     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dqa_checklist_items ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['dqa_settings', 'dqa_field_rules', 'dqa_checklist_items'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Signed-in users read %1$s" ON public.%1$I', t);
    EXECUTE format('CREATE POLICY "Signed-in users read %1$s" ON public.%1$I FOR SELECT USING (auth.uid() IS NOT NULL)', t);
    EXECUTE format('DROP POLICY IF EXISTS "Admins maintain %1$s" ON public.%1$I', t);
    EXECUTE format('CREATE POLICY "Admins maintain %1$s" ON public.%1$I FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin())', t);
    EXECUTE format('DROP TRIGGER IF EXISTS audit_%1$s ON public.%1$I', t);
    EXECUTE format('CREATE TRIGGER audit_%1$s AFTER INSERT OR UPDATE OR DELETE ON public.%1$I FOR EACH ROW EXECUTE FUNCTION public.audit_row_change()', t);
  END LOOP;
END $$;

-- ============================================================
-- 3. ASSESSMENT
-- ============================================================

-- Year of a period such as 'Q3 2027' or '2027'.
CREATE OR REPLACE FUNCTION public.period_year(p TEXT)
RETURNS INTEGER
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE WHEN p ~ '(19|20)[0-9]{2}' THEN substring(p FROM '((?:19|20)[0-9]{2})')::INTEGER END;
$$;

-- Sort key: 2027 Q3 -> 20273, year-only 2027 -> 20274 (end of year).
CREATE OR REPLACE FUNCTION public.period_sort_key(p TEXT)
RETURNS INTEGER
LANGUAGE sql IMMUTABLE
AS $$
  SELECT public.period_year(p) * 10
         + COALESCE(NULLIF(substring(p FROM '^Q([1-4])'), '')::INTEGER, 4);
$$;

CREATE OR REPLACE FUNCTION public.assess_report_quality(
  p_tool        report_type,
  p_institution INTEGER,
  p_district    INTEGER,
  p_target      INTEGER,
  p_indicator   INTEGER,
  p_period      TEXT,
  p_form        JSONB,
  p_exclude     UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_flags     JSONB := '[]'::jsonb;
  v_rule      public.dqa_field_rules%ROWTYPE;
  v_raw       TEXT;
  v_val       NUMERIC;
  v_prev_val  NUMERIC;
  v_prev      public.toolkit_reports%ROWTYPE;
  v_threshold NUMERIC;
  v_period    TEXT := COALESCE(NULLIF(TRIM(p_period), ''), NULLIF(TRIM(p_form->>'period'), ''), NULLIF(TRIM(p_form->>'year'), ''));
  v_year      INTEGER;
  v_now_key   INTEGER;
  v_change    NUMERIC;
BEGIN
  SELECT value INTO v_threshold FROM public.dqa_settings WHERE key = 'jump_threshold';
  v_threshold := COALESCE(v_threshold, 0.5);

  -- ── Period ──
  v_year := public.period_year(v_period);
  IF v_period IS NULL THEN
    v_flags := v_flags || jsonb_build_object('code', 'period_missing', 'severity', 'error',
      'message', 'The reporting period is missing.');
  ELSIF v_period !~ '^(Q[1-4] )?(19|20)[0-9]{2}$' THEN
    v_flags := v_flags || jsonb_build_object('code', 'period_format', 'severity', 'error',
      'message', format('Period "%s" is not a quarter (e.g. Q1 2027) or a year.', v_period));
  ELSIF v_year < 2020 OR v_year > 2030 THEN
    v_flags := v_flags || jsonb_build_object('code', 'period_range', 'severity', 'error',
      'message', format('Period %s is outside the NBSAP reporting period (2020-2030).', v_period));
  ELSE
    v_now_key := EXTRACT(YEAR FROM NOW())::INTEGER * 10 + EXTRACT(QUARTER FROM NOW())::INTEGER;
    IF (v_period ~ '^Q' AND public.period_sort_key(v_period) > v_now_key)
       OR (v_period !~ '^Q' AND v_year > EXTRACT(YEAR FROM NOW())::INTEGER) THEN
      v_flags := v_flags || jsonb_build_object('code', 'period_future', 'severity', 'error',
        'message', format('Period %s has not happened yet.', v_period));
    END IF;
  END IF;

  -- ── Metadata completeness ──
  IF p_target IS NULL THEN
    v_flags := v_flags || jsonb_build_object('code', 'no_target', 'severity', 'warning',
      'message', 'No NBSAP target is linked: this report will not count toward any target.');
  END IF;
  IF p_indicator IS NULL THEN
    v_flags := v_flags || jsonb_build_object('code', 'no_indicator', 'severity', 'warning',
      'message', 'No indicator is linked.');
  END IF;

  -- ── Previous published report for the same institution, district,
  --    target, indicator and tool, from an earlier period ──
  IF v_year IS NOT NULL THEN
    SELECT * INTO v_prev
    FROM public.toolkit_reports r
    WHERE r.workflow_status = 'published'
      AND r.tool_id = p_tool
      AND r.institution_id IS NOT DISTINCT FROM p_institution
      AND r.district_id    IS NOT DISTINCT FROM p_district
      AND r.nbsap_target_id IS NOT DISTINCT FROM p_target
      AND r.indicator_id   IS NOT DISTINCT FROM p_indicator
      AND (p_exclude IS NULL OR r.id <> p_exclude)
      AND public.period_sort_key(COALESCE(r.period, r.form_data->>'period', r.form_data->>'year'))
          < public.period_sort_key(v_period)
    ORDER BY public.period_sort_key(COALESCE(r.period, r.form_data->>'period', r.form_data->>'year')) DESC,
             r.published_at DESC NULLS LAST
    LIMIT 1;
  END IF;

  -- ── Field rules: numbers, ranges, units, jumps ──
  FOR v_rule IN SELECT * FROM public.dqa_field_rules WHERE tool_id = p_tool AND is_active ORDER BY id LOOP
    v_raw := NULLIF(TRIM(p_form->>v_rule.field_key), '');
    CONTINUE WHEN v_raw IS NULL;

    IF v_raw !~ '^-?[0-9]+(\.[0-9]+)?$' THEN
      v_flags := v_flags || jsonb_build_object('code', 'not_a_number', 'severity', 'error', 'field', v_rule.field_key,
        'message', format('%s must be a number (got "%s").', v_rule.label, v_raw));
      CONTINUE;
    END IF;
    v_val := v_raw::NUMERIC;

    IF v_rule.min_value IS NOT NULL AND v_val < v_rule.min_value THEN
      v_flags := v_flags || jsonb_build_object('code', 'below_min', 'severity', 'error', 'field', v_rule.field_key,
        'message', format('%s is %s; it cannot be below %s%s.', v_rule.label, v_val, v_rule.min_value,
                          COALESCE(' ' || v_rule.unit, '')));
    END IF;
    IF v_rule.max_value IS NOT NULL AND v_val > v_rule.max_value THEN
      v_flags := v_flags || jsonb_build_object('code', 'above_max', 'severity', 'error', 'field', v_rule.field_key,
        'message', format('%s is %s; it cannot be above %s%s.', v_rule.label, v_val, v_rule.max_value,
                          COALESCE(' ' || v_rule.unit, '')));
    END IF;

    IF v_rule.compare_jump AND v_prev.id IS NOT NULL THEN
      v_raw := NULLIF(TRIM(v_prev.form_data->>v_rule.field_key), '');
      IF v_raw ~ '^-?[0-9]+(\.[0-9]+)?$' THEN
        v_prev_val := v_raw::NUMERIC;
        IF v_prev_val <> 0 THEN
          v_change := (v_val - v_prev_val) / abs(v_prev_val);
          IF abs(v_change) >= v_threshold THEN
            v_flags := v_flags || jsonb_build_object(
              'code', 'jump', 'severity', 'warning', 'field', v_rule.field_key,
              'previous', v_prev_val, 'current', v_val,
              'change_pct', round(v_change * 100),
              'previous_period', COALESCE(v_prev.period, v_prev.form_data->>'year'),
              'previous_report_id', v_prev.id,
              'message', format('%s changed by %s%% since %s (%s -> %s%s). Check the figure and explain the change.',
                                v_rule.label, round(v_change * 100),
                                COALESCE(v_prev.period, v_prev.form_data->>'year'),
                                v_prev_val, v_val, COALESCE(' ' || v_rule.unit, '')));
          END IF;
        END IF;
      END IF;
    END IF;
  END LOOP;

  -- ── Consistency ──
  IF p_tool = 'T05'
     AND (p_form->>'budget_allocated') ~ '^[0-9]+(\.[0-9]+)?$'
     AND (p_form->>'budget_disbursed') ~ '^[0-9]+(\.[0-9]+)?$'
     AND (p_form->>'budget_disbursed')::NUMERIC > (p_form->>'budget_allocated')::NUMERIC THEN
    v_flags := v_flags || jsonb_build_object('code', 'disbursed_exceeds_allocated', 'severity', 'error',
      'field', 'budget_disbursed',
      'message', 'Budget disbursed cannot be more than budget allocated.');
  END IF;

  RETURN v_flags;
END;
$$;

-- Same assessment for the form before submission (live preview).
-- Institution and district are resolved exactly as on submission.
CREATE OR REPLACE FUNCTION public.preview_report_quality(
  p_tool      report_type,
  p_form      JSONB,
  p_target    INTEGER DEFAULT NULL,
  p_indicator INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inst   INTEGER;
  v_covers BOOLEAN := FALSE;
  v_dist   INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  SELECT id, covers_all_districts INTO v_inst, v_covers FROM public.institutions WHERE code = p_form->>'stakeholder';
  SELECT id INTO v_dist FROM public.districts
  WHERE lower(name) = lower(COALESCE(NULLIF(TRIM(p_form->>'district'), ''),
                                     CASE WHEN v_covers THEN NULLIF(TRIM(p_form->>'institution'), '') END));
  RETURN public.assess_report_quality(p_tool, v_inst, v_dist, p_target, p_indicator,
                                      NULLIF(TRIM(p_form->>'period'), ''), p_form);
END;
$$;

-- The checklist is complete when every active item is confirmed and the
-- declaration accepted.
CREATE OR REPLACE FUNCTION public.dqa_checklist_complete(p_declaration JSONB)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((p_declaration->>'declared')::BOOLEAN, FALSE)
     AND NOT EXISTS (
       SELECT 1 FROM public.dqa_checklist_items c
       WHERE c.is_active
         AND NOT (COALESCE(p_declaration->'items', '[]'::jsonb) @> to_jsonb(c.id))
     );
$$;

-- On submission: refuse errors, an incomplete checklist; record warnings.
CREATE OR REPLACE FUNCTION public.check_report_quality()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_flags  JSONB;
  v_errors TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    -- Service role / imports by administrators directly in the database.
    NEW.quality_flags := public.assess_report_quality(NEW.tool_id, NEW.institution_id, NEW.district_id,
      NEW.nbsap_target_id, NEW.indicator_id, NEW.period, NEW.form_data, NEW.id);
    RETURN NEW;
  END IF;

  IF NOT public.dqa_checklist_complete(NEW.dqa_declaration) THEN
    RAISE EXCEPTION 'Complete the data-quality checklist and the declaration before submitting'
      USING ERRCODE = '23514';
  END IF;

  v_flags := public.assess_report_quality(NEW.tool_id, NEW.institution_id, NEW.district_id,
    NEW.nbsap_target_id, NEW.indicator_id, NEW.period, NEW.form_data, NEW.id);
  SELECT string_agg(f->>'message', ' ') INTO v_errors
  FROM jsonb_array_elements(v_flags) f WHERE f->>'severity' = 'error';
  IF v_errors IS NOT NULL THEN
    RAISE EXCEPTION 'Data quality: %', v_errors USING ERRCODE = '23514';
  END IF;

  NEW.quality_flags   := v_flags;
  NEW.dqa_declaration := NEW.dqa_declaration
                         || jsonb_build_object('declared_by', auth.uid(), 'declared_at', NOW());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ac_check_report_quality ON public.toolkit_reports;
CREATE TRIGGER ac_check_report_quality
  BEFORE INSERT ON public.toolkit_reports
  FOR EACH ROW EXECUTE FUNCTION public.check_report_quality();

-- Resubmission (M02) checks the corrected report the same way.
DROP FUNCTION IF EXISTS public.resubmit_report(UUID, JSONB, JSONB, TEXT);
CREATE OR REPLACE FUNCTION public.resubmit_report(
  p_report      UUID,
  p_form_data   JSONB DEFAULT NULL,
  p_attachments JSONB DEFAULT NULL,
  p_note        TEXT  DEFAULT NULL,
  p_declaration JSONB DEFAULT NULL
)
RETURNS public.toolkit_reports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid    UUID := auth.uid();
  r        public.toolkit_reports%ROWTYPE;
  v_form   JSONB;
  v_atts   JSONB;
  v_route  INTEGER[];
  v_flags  JSONB;
  v_errors TEXT;
BEGIN
  SELECT * INTO r FROM public.toolkit_reports WHERE id = p_report FOR UPDATE;
  IF NOT FOUND OR r.submitted_by IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'Only the person who submitted this report can resubmit it' USING ERRCODE = '42501';
  END IF;
  IF r.workflow_status <> 'returned' THEN
    RAISE EXCEPTION 'Only returned reports can be resubmitted' USING ERRCODE = '22023';
  END IF;
  IF NOT public.dqa_checklist_complete(p_declaration) THEN
    RAISE EXCEPTION 'Complete the data-quality checklist and the declaration before resubmitting'
      USING ERRCODE = '23514';
  END IF;

  v_form := COALESCE(p_form_data, r.form_data);
  v_atts := COALESCE(p_attachments, r.attachments);
  IF (v_form->>'stakeholder') IS DISTINCT FROM (r.form_data->>'stakeholder')
     OR (v_form->>'district') IS DISTINCT FROM (r.form_data->>'district') THEN
    RAISE EXCEPTION 'The institution and district of a report cannot change; submit a new report instead'
      USING ERRCODE = '22023';
  END IF;

  v_flags := public.assess_report_quality(r.tool_id, r.institution_id, r.district_id,
    r.nbsap_target_id, r.indicator_id, r.period, v_form, r.id);
  SELECT string_agg(f->>'message', ' ') INTO v_errors
  FROM jsonb_array_elements(v_flags) f WHERE f->>'severity' = 'error';
  IF v_errors IS NOT NULL THEN
    RAISE EXCEPTION 'Data quality: %', v_errors USING ERRCODE = '23514';
  END IF;

  v_route := public.report_route(r.institution_id, r.district_id, r.indicator_id, v_atts);
  IF array_length(v_route, 1) IS NULL THEN
    RAISE EXCEPTION 'No validation stage applies to this report' USING ERRCODE = '23514';
  END IF;

  PERFORM set_config('nbsap.workflow_rpc', 'on', TRUE);
  UPDATE public.toolkit_reports
  SET form_data = v_form, attachments = v_atts, route = v_route,
      workflow_status = 'submitted', current_stage_id = v_route[1], returned_at_stage_id = NULL,
      last_action = 'resubmit', review_note = NULLIF(TRIM(p_note), ''),
      reviewed_by = NULL, reviewed_at = NULL, submitted_at = NOW(),
      quality_flags = v_flags,
      dqa_declaration = p_declaration || jsonb_build_object('declared_by', v_uid, 'declared_at', NOW())
  WHERE id = p_report RETURNING * INTO r;
  PERFORM set_config('nbsap.workflow_rpc', 'off', TRUE);
  RETURN r;
END;
$$;

REVOKE ALL ON FUNCTION public.assess_report_quality(report_type, INTEGER, INTEGER, INTEGER, INTEGER, TEXT, JSONB, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.check_report_quality() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.preview_report_quality(report_type, JSONB, INTEGER, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dqa_checklist_complete(JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.resubmit_report(UUID, JSONB, JSONB, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.preview_report_quality(report_type, JSONB, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dqa_checklist_complete(JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resubmit_report(UUID, JSONB, JSONB, TEXT, JSONB) TO authenticated;

INSERT INTO public.audit_log (user_id, action_type, action, detail, role, source)
VALUES (NULL, 'schema_migration', 'Data quality checks and DQA checklist (043, M04)',
        'Field rules, jump threshold, checklist and declaration; quality flags recorded on reports and shown to validators.',
        'system', 'database');

COMMIT;

-- ============================================================
-- M06 — CSV/EXCEL BULK UPLOAD
-- Migration: 046_bulk_import.sql
-- Source: "NBSAP Monitoring System: status and development
--          requirements" (4 Nov 2026), module M06.
--
-- PDF: provide a template per module. Validate and preview before
-- import, reporting errors by row.
-- Done when: a 500-row file imports cleanly, or returns row-level
-- errors with nothing partly saved.
--
-- import_reports(rows, declaration, dry_run):
--   * runs as the caller (SECURITY INVOKER): row-level security, the
--     scope trigger (039), the workflow (040), the data-quality and
--     checklist trigger (043) and the breakdown check (045) apply to
--     every row exactly as for a report typed in the form;
--   * each row is tried on its own savepoint so every failing row is
--     reported with its reason;
--   * if any row fails, or on a dry run, everything is rolled back:
--     nothing is ever partly saved;
--   * returns {ok, imported, dry_run, rows: [{row, ok, errors, warnings}]}.
-- One data-quality declaration covers the file: the submitter confirms
-- the checklist once for all rows.
-- ============================================================

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'assess_disaggregation') THEN
    RAISE EXCEPTION 'Migration 046 needs 045 (indicator reference data). Apply 037-045 first.';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.import_reports(
  p_rows        JSONB,
  p_declaration JSONB,
  p_dry_run     BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_max     CONSTANT INTEGER := 1000;
  v_n       INTEGER;
  v_row     JSONB;
  v_i       INTEGER := 0;
  v_results JSONB := '[]'::jsonb;
  v_failed  INTEGER := 0;
  v_flags   JSONB;
  v_msg     TEXT;
  v_state   TEXT;
  v_tool    TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(p_rows) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Rows must be a JSON array' USING ERRCODE = '22023';
  END IF;
  v_n := jsonb_array_length(p_rows);
  IF v_n = 0 THEN
    RAISE EXCEPTION 'The file has no rows' USING ERRCODE = '22023';
  END IF;
  IF v_n > v_max THEN
    RAISE EXCEPTION 'At most % rows per file (this file has %)', v_max, v_n USING ERRCODE = '22023';
  END IF;

  BEGIN
    FOR v_row IN SELECT value FROM jsonb_array_elements(p_rows) LOOP
      v_i := v_i + 1;
      v_tool := v_row->>'tool_id';
      BEGIN
        IF v_tool IS NULL OR v_row->'form_data' IS NULL OR jsonb_typeof(v_row->'form_data') <> 'object' THEN
          RAISE EXCEPTION 'Each row needs tool_id and form_data' USING ERRCODE = '22023';
        END IF;
        INSERT INTO public.toolkit_reports
          (tool_id, tool_name, submitted_by, status, period, form_data, attachments,
           district, institution, nbsap_target_id, indicator_id, dqa_declaration, submitted_at)
        VALUES
          (v_tool::report_type,
           COALESCE(NULLIF(v_row->>'tool_name', ''), v_tool),
           auth.uid(),
           'pending',
           NULLIF(TRIM(v_row->>'period'), ''),
           v_row->'form_data',
           '[]'::jsonb,
           NULLIF(TRIM(v_row->'form_data'->>'district'), ''),
           NULLIF(TRIM(v_row->'form_data'->>'institution'), ''),
           NULLIF(v_row->>'nbsap_target_id', '')::INTEGER,
           NULLIF(v_row->>'indicator_id', '')::INTEGER,
           p_declaration,
           NOW())
        RETURNING quality_flags INTO v_flags;

        v_results := v_results || jsonb_build_object(
          'row', v_i, 'ok', TRUE, 'errors', '[]'::jsonb,
          'warnings', COALESCE((SELECT jsonb_agg(f->>'message') FROM jsonb_array_elements(v_flags) f
                                WHERE f->>'severity' = 'warning'), '[]'::jsonb));
      EXCEPTION WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_msg = MESSAGE_TEXT, v_state = RETURNED_SQLSTATE;
        v_failed := v_failed + 1;
        v_msg := CASE
          WHEN v_state = '23505' THEN
            'Duplicate: a report for this module, period and target already exists (in the system or earlier in this file).'
          WHEN v_state = '42501' OR v_msg ILIKE '%row-level security%' THEN
            'You may not submit for this institution or district.'
          WHEN v_state = '22P02' THEN
            format('Invalid value: %s', v_msg)
          WHEN v_state = '23503' THEN
            'Unknown NBSAP target or indicator.'
          ELSE regexp_replace(v_msg, '^Data quality: ', '')
        END;
        v_results := v_results || jsonb_build_object('row', v_i, 'ok', FALSE,
                                                     'errors', jsonb_build_array(v_msg),
                                                     'warnings', '[]'::jsonb);
      END;
    END LOOP;

    IF v_failed > 0 OR p_dry_run THEN
      -- Undo every row of this file (the handler below keeps the result).
      RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = 'nbsap_import_rollback';
    END IF;
  EXCEPTION WHEN raise_exception THEN
    GET STACKED DIAGNOSTICS v_msg = MESSAGE_TEXT;
    IF v_msg <> 'nbsap_import_rollback' THEN
      RAISE;
    END IF;
  END;

  RETURN jsonb_build_object(
    'ok', v_failed = 0,
    'dry_run', p_dry_run,
    'imported', CASE WHEN v_failed = 0 AND NOT p_dry_run THEN v_n ELSE 0 END,
    'failed', v_failed,
    'rows', v_results);
END;
$$;

COMMENT ON FUNCTION public.import_reports(JSONB, JSONB, BOOLEAN) IS
'M06: bulk import of report rows as the caller. All rows are checked like form submissions; any failing row, or a dry run, rolls back the whole file. Returns per-row errors and warnings.';

REVOKE ALL ON FUNCTION public.import_reports(JSONB, JSONB, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.import_reports(JSONB, JSONB, BOOLEAN) TO authenticated;

INSERT INTO public.audit_log (user_id, action_type, action, detail, role, source)
VALUES (NULL, 'schema_migration', 'Bulk import (046, M06)',
        'import_reports(): per-row errors, all-or-nothing, dry run for preview.',
        'system', 'database');

COMMIT;

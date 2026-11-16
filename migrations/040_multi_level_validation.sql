-- ============================================================
-- M02 — MULTI-LEVEL VALIDATION
-- Migration: 040_multi_level_validation.sql
-- Source: "NBSAP Monitoring System: status and development
--          requirements" (4 Nov 2026), module M02.
--
-- Done when (PDF): one report passes district, ministry, NISR, RLMUA and
-- REMA, and can be returned at any stage. Progress changes only on
-- publication.
--
--   1. validation_stages: the order, who acts and which reports each
--      stage applies to are DATA, so REMA's Decision 3 is a configuration
--      change, not a code change. Defaults follow the PDF recommendation:
--      district -> ministry -> NISR -> RLMUA -> REMA publishes.
--   2. Each report gets its own route (the stages that apply to it) and
--      moves through it: submitted -> in_validation -> published, or
--      returned (to the submitter, from any stage, also after
--      publication) / rejected.
--   3. Every move goes through review_report() / resubmit_report().
--      Direct UPDATEs of reports are no longer possible for users.
--   4. report_status_history: who, when, which stage, what, note --
--      written by the database, append-only.
--   5. The old status column is derived: published -> 'approved',
--      rejected -> 'rejected', everything else -> 'pending'. Every
--      progress, metric and evaluation view that counts status =
--      'approved' therefore counts PUBLISHED reports only, without
--      rewriting the nine migrations that use it.
--   6. "System admin cannot approve data" (PDF target roles): publishing
--      needs the rema_verifier scope; dashboard_management alone no
--      longer approves anything.
--
-- ROLLOUT: grant the validator scopes (district_validator,
-- ministry_validator, nisr_validator, rlmua_validator, rema_verifier)
-- before announcing, or pending reports will wait at their first stage.
-- ============================================================

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.user_scopes') IS NULL OR to_regclass('public.institutions') IS NULL THEN
    RAISE EXCEPTION 'Migration 040 needs 039 (institutions and access scope). Apply 037, 038 and 039 first.';
  END IF;
END $$;

-- ============================================================
-- 1. STAGES (configuration)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.validation_stages (
  id               SERIAL PRIMARY KEY,
  code             TEXT NOT NULL UNIQUE,
  name             TEXT NOT NULL,
  ordinal          INTEGER NOT NULL,
  -- user_scopes.scope_role that acts at this stage
  scope_role       TEXT NOT NULL,
  -- which reports pass through this stage
  applies_to       TEXT NOT NULL CHECK (applies_to IN (
                     'all_reports',          -- every report
                     'district_reports',     -- reports about a district
                     'institution_reports',  -- reports of a single institution (not District Authorities)
                     'flagged_indicators',   -- indicators marked for statistical sign-off
                     'spatial_reports')),    -- reports with map/GIS evidence
  -- how the validator's scope must match the report
  scope_match      TEXT NOT NULL CHECK (scope_match IN (
                     'report_district',      -- validator's district = report's district
                     'report_institution',   -- validator's institution = report's institution
                     'national')),           -- validator of the named institution, any report
  -- for national stages: whose staff act (institutions.code)
  institution_code TEXT REFERENCES public.institutions(code),
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (scope_match <> 'national' OR institution_code IS NOT NULL)
);

COMMENT ON TABLE public.validation_stages IS
'M02 validation route. Active stages, in ordinal order, that apply to a report form its route. Changing order or activation affects reports submitted afterwards (and resubmissions).';

-- PDF recommendation for Decision 3. RLMUA = NLA in the institutions
-- table (National Land Authority, now the Rwanda Land Management and Use
-- Authority).
INSERT INTO public.validation_stages (code, name, ordinal, scope_role, applies_to, scope_match, institution_code) VALUES
  ('district', 'District validation',               10, 'district_validator', 'district_reports',    'report_district',    NULL),
  ('ministry', 'Ministry / institution validation', 20, 'ministry_validator', 'institution_reports', 'report_institution', NULL),
  ('nisr',     'NISR statistical sign-off',         30, 'nisr_validator',     'flagged_indicators',  'national',           'NISR'),
  ('rlmua',    'RLMUA spatial sign-off',            40, 'rlmua_validator',    'spatial_reports',     'national',           'NLA'),
  ('rema',     'REMA verification and publication', 50, 'rema_verifier',      'all_reports',         'national',           'REMA')
ON CONFLICT (code) DO NOTHING;

ALTER TABLE public.validation_stages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Signed-in users read stages" ON public.validation_stages;
CREATE POLICY "Signed-in users read stages" ON public.validation_stages
  FOR SELECT USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Admins configure stages" ON public.validation_stages;
CREATE POLICY "Admins configure stages" ON public.validation_stages
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP TRIGGER IF EXISTS set_updated_at_validation_stages ON public.validation_stages;
CREATE TRIGGER set_updated_at_validation_stages
  BEFORE UPDATE ON public.validation_stages
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
DROP TRIGGER IF EXISTS audit_validation_stages ON public.validation_stages;
CREATE TRIGGER audit_validation_stages
  AFTER INSERT OR UPDATE OR DELETE ON public.validation_stages
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

-- Statistical sign-off is per indicator (M05 will add the full
-- validation route per indicator; this flag is its first part).
ALTER TABLE public.indicators
  ADD COLUMN IF NOT EXISTS requires_statistical_validation BOOLEAN NOT NULL DEFAULT FALSE;

-- 001 let every writer (including data entry) UPDATE any indicator column:
-- baselines, current values, progress -- and now this flag, which would let
-- a submitter skip NISR sign-off. Indicator reference data is REMA's to
-- maintain. (The only non-admin writes came from the 017 progress trigger,
-- which section 7 below replaces with a SECURITY DEFINER function.)
DROP POLICY IF EXISTS "Writers can update indicators" ON public.indicators;
DROP POLICY IF EXISTS "Admins update indicators" ON public.indicators;
CREATE POLICY "Admins update indicators" ON public.indicators
  FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());

-- ============================================================
-- 2. VALIDATOR SCOPES
-- ============================================================

DO $$
DECLARE v_con TEXT;
BEGIN
  SELECT conname INTO v_con FROM pg_constraint
  WHERE conrelid = 'public.user_scopes'::regclass AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%scope_role%';
  IF v_con IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.user_scopes DROP CONSTRAINT %I', v_con);
  END IF;
END $$;

ALTER TABLE public.user_scopes ADD CONSTRAINT user_scopes_scope_role_check CHECK (scope_role IN (
  'data_entry', 'institution_admin',
  'district_validator', 'ministry_validator', 'nisr_validator', 'rlmua_validator', 'rema_verifier'));

CREATE OR REPLACE FUNCTION public.validate_user_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid    UUID := auth.uid();
  v_covers BOOLEAN;
  v_code   TEXT;
  v_role   TEXT;
  v_stage  public.validation_stages%ROWTYPE;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Scopes cannot be edited; revoke and grant instead' USING ERRCODE = '42501';
  END IF;

  IF v_uid IS NOT NULL AND NEW.user_id = v_uid THEN
    RAISE EXCEPTION 'Nobody can grant a scope to themselves' USING ERRCODE = '42501';
  END IF;

  SELECT covers_all_districts, code INTO v_covers, v_code FROM public.institutions WHERE id = NEW.institution_id;
  IF v_covers AND NEW.district_id IS NULL THEN
    RAISE EXCEPTION 'This institution covers all districts: choose the district' USING ERRCODE = '23514';
  END IF;

  IF NEW.sector_id IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM public.sectors s WHERE s.id = NEW.sector_id AND s.district_id = NEW.district_id) THEN
    RAISE EXCEPTION 'The sector must belong to the chosen district' USING ERRCODE = '23514';
  END IF;

  SELECT role::text INTO v_role FROM public.profiles WHERE id = NEW.user_id;

  IF NEW.scope_role = 'data_entry'
     AND v_role NOT IN ('local_reporting', 'lead_government_ministry_reporting', 'dashboard_management') THEN
    RAISE EXCEPTION 'Data entry needs a reporting account (current role: %)', v_role USING ERRCODE = '23514';
  END IF;
  IF NEW.scope_role = 'ministry_validator' AND v_role <> 'lead_government_ministry_reporting' THEN
    RAISE EXCEPTION 'Ministry validation needs a Lead Government Ministry account (current role: %)', v_role
      USING ERRCODE = '23514';
  END IF;
  IF NEW.scope_role = 'district_validator' AND NOT v_covers THEN
    RAISE EXCEPTION 'District validation is granted on District Authorities with a district' USING ERRCODE = '23514';
  END IF;
  IF NEW.scope_role IN ('institution_admin', 'district_validator', 'nisr_validator', 'rlmua_validator', 'rema_verifier')
     AND v_role IN ('public_viewer', 'programme_alignment') THEN
    RAISE EXCEPTION 'This scope needs an active government staff account (current role: %)', v_role
      USING ERRCODE = '23514';
  END IF;

  -- National stages name the institution whose staff act.
  SELECT * INTO v_stage FROM public.validation_stages
  WHERE scope_role = NEW.scope_role AND scope_match = 'national' LIMIT 1;
  IF FOUND AND v_stage.institution_code IS DISTINCT FROM v_code THEN
    RAISE EXCEPTION '% is granted to % staff only', v_stage.name, v_stage.institution_code USING ERRCODE = '23514';
  END IF;

  NEW.granted_by := COALESCE(v_uid, NEW.granted_by);
  NEW.granted_at := NOW();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 3. WORKFLOW COLUMNS AND HISTORY
-- ============================================================

ALTER TABLE public.toolkit_reports
  ADD COLUMN IF NOT EXISTS workflow_status TEXT NOT NULL DEFAULT 'submitted'
    CHECK (workflow_status IN ('draft', 'submitted', 'in_validation', 'returned', 'published', 'rejected')),
  ADD COLUMN IF NOT EXISTS current_stage_id      INTEGER REFERENCES public.validation_stages(id),
  ADD COLUMN IF NOT EXISTS route                 INTEGER[],
  ADD COLUMN IF NOT EXISTS returned_at_stage_id  INTEGER REFERENCES public.validation_stages(id),
  ADD COLUMN IF NOT EXISTS last_action           TEXT,
  ADD COLUMN IF NOT EXISTS published_at          TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_reports_workflow ON public.toolkit_reports(workflow_status, current_stage_id);

COMMENT ON COLUMN public.toolkit_reports.status IS
'Derived from workflow_status (migration 040): published -> approved, rejected -> rejected, otherwise pending. Kept so existing progress and metric views count published reports only.';

CREATE TABLE IF NOT EXISTS public.report_status_history (
  id           BIGSERIAL PRIMARY KEY,
  report_id    UUID NOT NULL REFERENCES public.toolkit_reports(id) ON DELETE CASCADE,
  action       TEXT NOT NULL,
  from_status  TEXT,
  to_status    TEXT NOT NULL,
  stage_id     INTEGER REFERENCES public.validation_stages(id),
  next_stage_id INTEGER REFERENCES public.validation_stages(id),
  note         TEXT,
  actor        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_history_report ON public.report_status_history(report_id, created_at);

-- Append-only (the actor may be nulled when an account is deleted).
CREATE OR REPLACE FUNCTION public.history_append_only()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.actor IS NOT NULL AND NEW.actor IS NULL
     AND (to_jsonb(NEW) - 'actor') = (to_jsonb(OLD) - 'actor') THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE' AND NOT EXISTS (SELECT 1 FROM public.toolkit_reports WHERE id = OLD.report_id) THEN
    RETURN OLD;  -- the report itself was deleted (cascade)
  END IF;
  RAISE EXCEPTION 'report_status_history is append-only (% not allowed)', TG_OP USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS history_append_only ON public.report_status_history;
CREATE TRIGGER history_append_only
  BEFORE UPDATE OR DELETE ON public.report_status_history
  FOR EACH ROW EXECUTE FUNCTION public.history_append_only();

ALTER TABLE public.report_status_history ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.report_status_history FROM anon, authenticated;
-- Visible to whoever can see the report (the report's own RLS applies).
DROP POLICY IF EXISTS "Read history of visible reports" ON public.report_status_history;
CREATE POLICY "Read history of visible reports" ON public.report_status_history
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.toolkit_reports r WHERE r.id = report_id));

-- ============================================================
-- 4. ROUTE, MATCHING AND DERIVED STATUS
-- ============================================================

CREATE OR REPLACE FUNCTION public.report_route(
  p_institution INTEGER,
  p_district    INTEGER,
  p_indicator   INTEGER,
  p_attachments JSONB
)
RETURNS INTEGER[]
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(array_agg(s.id ORDER BY s.ordinal, s.id), '{}')
  FROM public.validation_stages s
  WHERE s.is_active
    AND CASE s.applies_to
          WHEN 'all_reports'         THEN TRUE
          WHEN 'district_reports'    THEN p_district IS NOT NULL
          WHEN 'institution_reports' THEN EXISTS (SELECT 1 FROM public.institutions i
                                                  WHERE i.id = p_institution AND NOT i.covers_all_districts)
          WHEN 'flagged_indicators'  THEN EXISTS (SELECT 1 FROM public.indicators x
                                                  WHERE x.id = p_indicator AND x.requires_statistical_validation)
          WHEN 'spatial_reports'     THEN COALESCE(p_attachments, '[]'::jsonb) @> '[{"evidence_type": "map_gis"}]'::jsonb
        END;
$$;

-- Caller may act at this stage for a report with this institution/district.
CREATE OR REPLACE FUNCTION public.can_act_at_stage(p_stage INTEGER, p_institution INTEGER, p_district INTEGER)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.validation_stages st
    JOIN public.user_scopes sc ON sc.scope_role = st.scope_role AND sc.user_id = auth.uid()
    LEFT JOIN public.institutions ni ON ni.code = st.institution_code
    WHERE st.id = p_stage
      AND CASE st.scope_match
            WHEN 'report_district'    THEN sc.district_id IS NOT NULL AND sc.district_id = p_district
            WHEN 'report_institution' THEN sc.institution_id = p_institution
                                           AND (sc.district_id IS NULL OR sc.district_id IS NOT DISTINCT FROM p_district)
            WHEN 'national'           THEN sc.institution_id = ni.id
          END
  );
$$;

-- Validators read the reports whose route passes through their stages.
CREATE OR REPLACE FUNCTION public.can_read_as_validator(p_route INTEGER[], p_institution INTEGER, p_district INTEGER)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM unnest(COALESCE(p_route, '{}')) AS r(stage_id)
    WHERE public.can_act_at_stage(r.stage_id, p_institution, p_district)
  );
$$;

REVOKE ALL ON FUNCTION public.report_route(INTEGER, INTEGER, INTEGER, JSONB)    FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_act_at_stage(INTEGER, INTEGER, INTEGER)       FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_read_as_validator(INTEGER[], INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_route(INTEGER, INTEGER, INTEGER, JSONB)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_act_at_stage(INTEGER, INTEGER, INTEGER)       TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_as_validator(INTEGER[], INTEGER, INTEGER) TO authenticated;

-- New reports start their route; the browser cannot choose a status.
CREATE OR REPLACE FUNCTION public.start_report_workflow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.route := public.report_route(NEW.institution_id, NEW.district_id, NEW.indicator_id, NEW.attachments);
  IF array_length(NEW.route, 1) IS NULL THEN
    RAISE EXCEPTION 'No validation stage applies to this report; ask REMA to check the validation workflow'
      USING ERRCODE = '23514';
  END IF;
  NEW.workflow_status      := 'submitted';
  NEW.current_stage_id     := NEW.route[1];
  NEW.returned_at_stage_id := NULL;
  NEW.last_action          := 'submit';
  NEW.published_at         := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ab_start_report_workflow ON public.toolkit_reports;
CREATE TRIGGER ab_start_report_workflow
  BEFORE INSERT ON public.toolkit_reports
  FOR EACH ROW EXECUTE FUNCTION public.start_report_workflow();

CREATE OR REPLACE FUNCTION public.derive_report_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.status := CASE NEW.workflow_status
                  WHEN 'published' THEN 'approved'::submission_status
                  WHEN 'rejected'  THEN 'rejected'::submission_status
                  ELSE 'pending'::submission_status
                END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS zz_derive_report_status ON public.toolkit_reports;
CREATE TRIGGER zz_derive_report_status
  BEFORE INSERT OR UPDATE ON public.toolkit_reports
  FOR EACH ROW EXECUTE FUNCTION public.derive_report_status();

-- Reports change only through the workflow functions below (or the
-- service role). This replaces guard_report_review from 037.
CREATE OR REPLACE FUNCTION public.guard_report_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR current_setting('nbsap.workflow_rpc', TRUE) = 'on' THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Reports change only through review_report() or resubmit_report()' USING ERRCODE = '42501';
END;
$$;

DROP POLICY IF EXISTS "Reviewers update report status" ON public.toolkit_reports;
REVOKE UPDATE ON public.toolkit_reports FROM anon, authenticated;

-- History, written by the database.
CREATE OR REPLACE FUNCTION public.record_report_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.report_status_history (report_id, action, from_status, to_status, stage_id, next_stage_id, note, actor)
    VALUES (NEW.id, 'submit', NULL, NEW.workflow_status, NULL, NEW.current_stage_id, NULL, auth.uid());
  ELSIF NEW.workflow_status IS DISTINCT FROM OLD.workflow_status
     OR NEW.current_stage_id IS DISTINCT FROM OLD.current_stage_id THEN
    INSERT INTO public.report_status_history (report_id, action, from_status, to_status, stage_id, next_stage_id, note, actor)
    VALUES (NEW.id, COALESCE(NEW.last_action, 'update'), OLD.workflow_status, NEW.workflow_status,
            OLD.current_stage_id,
            CASE WHEN NEW.workflow_status IN ('submitted', 'in_validation') THEN NEW.current_stage_id END,
            NEW.review_note, auth.uid());
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS record_report_history ON public.toolkit_reports;
CREATE TRIGGER record_report_history
  AFTER INSERT OR UPDATE ON public.toolkit_reports
  FOR EACH ROW EXECUTE FUNCTION public.record_report_history();

REVOKE ALL ON FUNCTION public.start_report_workflow()  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.derive_report_status()   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_report_history()  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.history_append_only()    FROM PUBLIC, anon, authenticated;

-- ============================================================
-- 5. WORKFLOW FUNCTIONS
-- ============================================================

-- approve: move to the next stage, or publish at the last one.
-- return:  send back to the submitter (note required); allowed at any
--          stage, and on a published report by the final stage.
-- reject:  close the report (note required).
CREATE OR REPLACE FUNCTION public.review_report(p_report UUID, p_action TEXT, p_note TEXT DEFAULT NULL)
RETURNS public.toolkit_reports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid   UUID := auth.uid();
  r       public.toolkit_reports%ROWTYPE;
  v_stage INTEGER;
  v_pos   INTEGER;
  v_next  INTEGER;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '42501';
  END IF;
  IF p_action NOT IN ('approve', 'return', 'reject') THEN
    RAISE EXCEPTION 'Action must be approve, return or reject' USING ERRCODE = '22023';
  END IF;
  IF p_action IN ('return', 'reject') AND NULLIF(TRIM(p_note), '') IS NULL THEN
    RAISE EXCEPTION 'Explain why: a note is required to % a report', p_action USING ERRCODE = '22023';
  END IF;

  SELECT * INTO r FROM public.toolkit_reports WHERE id = p_report FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Report not found' USING ERRCODE = '22023';
  END IF;
  IF r.submitted_by = v_uid THEN
    RAISE EXCEPTION 'You cannot review your own submission' USING ERRCODE = '42501';
  END IF;

  IF r.workflow_status = 'published' THEN
    -- Withdrawing a publication (DHIS2 "unapprove"): final stage only, by return.
    v_stage := r.route[array_length(r.route, 1)];
    IF p_action <> 'return' THEN
      RAISE EXCEPTION 'A published report can only be returned' USING ERRCODE = '22023';
    END IF;
  ELSIF r.workflow_status IN ('submitted', 'in_validation') THEN
    v_stage := r.current_stage_id;
  ELSE
    RAISE EXCEPTION 'This report is % and is not waiting for validation', r.workflow_status USING ERRCODE = '22023';
  END IF;

  IF NOT public.can_act_at_stage(v_stage, r.institution_id, r.district_id) THEN
    RAISE EXCEPTION 'You are not a validator for this stage of this report' USING ERRCODE = '42501';
  END IF;

  PERFORM set_config('nbsap.workflow_rpc', 'on', TRUE);

  IF p_action = 'approve' THEN
    v_pos  := array_position(r.route, v_stage);
    v_next := r.route[v_pos + 1];
    IF v_next IS NULL THEN
      UPDATE public.toolkit_reports
      SET workflow_status = 'published', current_stage_id = NULL, last_action = 'publish',
          review_note = NULLIF(TRIM(p_note), ''), reviewed_by = v_uid, reviewed_at = NOW(), published_at = NOW()
      WHERE id = p_report RETURNING * INTO r;
    ELSE
      UPDATE public.toolkit_reports
      SET workflow_status = 'in_validation', current_stage_id = v_next, last_action = 'approve',
          review_note = NULLIF(TRIM(p_note), '')
      WHERE id = p_report RETURNING * INTO r;
    END IF;
  ELSIF p_action = 'return' THEN
    UPDATE public.toolkit_reports
    SET workflow_status = 'returned', returned_at_stage_id = v_stage, current_stage_id = v_stage,
        last_action = 'return', review_note = TRIM(p_note), published_at = NULL
    WHERE id = p_report RETURNING * INTO r;
  ELSE
    UPDATE public.toolkit_reports
    SET workflow_status = 'rejected', current_stage_id = v_stage, last_action = 'reject',
        review_note = TRIM(p_note), reviewed_by = v_uid, reviewed_at = NOW()
    WHERE id = p_report RETURNING * INTO r;
  END IF;

  PERFORM set_config('nbsap.workflow_rpc', 'off', TRUE);
  RETURN r;
END;
$$;

-- The submitter corrects a returned report and sends it again. The route
-- is recalculated and starts from the first stage: the data changed, so
-- every stage checks it again. Institution and district cannot change.
CREATE OR REPLACE FUNCTION public.resubmit_report(
  p_report      UUID,
  p_form_data   JSONB DEFAULT NULL,
  p_attachments JSONB DEFAULT NULL,
  p_note        TEXT  DEFAULT NULL
)
RETURNS public.toolkit_reports
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid   UUID := auth.uid();
  r       public.toolkit_reports%ROWTYPE;
  v_form  JSONB;
  v_atts  JSONB;
  v_route INTEGER[];
BEGIN
  SELECT * INTO r FROM public.toolkit_reports WHERE id = p_report FOR UPDATE;
  IF NOT FOUND OR r.submitted_by IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'Only the person who submitted this report can resubmit it' USING ERRCODE = '42501';
  END IF;
  IF r.workflow_status <> 'returned' THEN
    RAISE EXCEPTION 'Only returned reports can be resubmitted' USING ERRCODE = '22023';
  END IF;

  v_form := COALESCE(p_form_data, r.form_data);
  v_atts := COALESCE(p_attachments, r.attachments);
  IF (v_form->>'stakeholder') IS DISTINCT FROM (r.form_data->>'stakeholder')
     OR (v_form->>'district') IS DISTINCT FROM (r.form_data->>'district') THEN
    RAISE EXCEPTION 'The institution and district of a report cannot change; submit a new report instead'
      USING ERRCODE = '22023';
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
      reviewed_by = NULL, reviewed_at = NULL, submitted_at = NOW()
  WHERE id = p_report RETURNING * INTO r;
  PERFORM set_config('nbsap.workflow_rpc', 'off', TRUE);
  RETURN r;
END;
$$;

REVOKE ALL ON FUNCTION public.review_report(UUID, TEXT, TEXT)                 FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.resubmit_report(UUID, JSONB, JSONB, TEXT)       FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_report(UUID, TEXT, TEXT)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.resubmit_report(UUID, JSONB, JSONB, TEXT)    TO authenticated;

-- ============================================================
-- 6. WHO CAN READ WHAT
-- ============================================================

-- Validators (any base role) read the reports routed through their stages.
DROP POLICY IF EXISTS "Validators read routed reports" ON public.toolkit_reports;
CREATE POLICY "Validators read routed reports" ON public.toolkit_reports
  FOR SELECT USING (public.can_read_as_validator(route, institution_id, district_id));

-- Submitters always read their own reports (needed to correct returned ones).
DROP POLICY IF EXISTS "Submitters read own reports" ON public.toolkit_reports;
CREATE POLICY "Submitters read own reports" ON public.toolkit_reports
  FOR SELECT USING (submitted_by = auth.uid());

-- ============================================================
-- 7. STORED TARGET PROGRESS FOLLOWS PUBLICATION
-- ============================================================
-- nbsap_targets.progress (shown on the dashboard) is maintained
-- incrementally by trigger_update_target_progress (migration 017). It
-- added a report's contribution on EVERY update of an approved report,
-- never removed it when an approval was withdrawn, and added it again on
-- republication. Recomputing from reports is not an option: the stored
-- value also carries seeded baselines. So the same formula is now applied
-- only when a report ENTERS publication, and reversed when it LEAVES.
-- (Deletion keeps using reverse_progress_on_report_delete from 019.)

CREATE OR REPLACE FUNCTION public.shift_target_progress(
  p_target    INTEGER,
  p_tool      TEXT,
  p_direction INTEGER,  -- +1 publish, -1 withdraw
  p_report    UUID,
  p_actor     UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prev  INTEGER;
  v_step  INTEGER;
  v_new   INTEGER;
BEGIN
  SELECT progress INTO v_prev FROM public.nbsap_targets WHERE id = p_target;
  IF NOT FOUND THEN
    RETURN;
  END IF;
  v_step := CEIL(20 * public.get_tool_weight(p_tool));

  IF p_direction > 0 THEN
    v_new := LEAST(100, GREATEST(0, COALESCE(v_prev, 0) + v_step));
    UPDATE public.nbsap_targets
    SET progress = v_new, last_auto_update = NOW(),
        auto_update_count = COALESCE(auto_update_count, 0) + 1, updated_at = NOW()
    WHERE id = p_target;
    -- as migration 017
    UPDATE public.indicators
    SET progress = LEAST(100, GREATEST(progress, v_new - 10)),
        status = CASE WHEN v_new >= 70 THEN 'on-track'::indicator_status
                      WHEN v_new >= 40 THEN 'at-risk'::indicator_status
                      ELSE 'behind'::indicator_status END,
        updated_at = NOW()
    WHERE nbsap_target_id = p_target;
  ELSE
    v_new := GREATEST(0, COALESCE(v_prev, 0) - v_step);
    UPDATE public.nbsap_targets
    SET progress = v_new, auto_update_count = GREATEST(0, COALESCE(auto_update_count, 0) - 1),
        updated_at = NOW()
    WHERE id = p_target;
    -- as migration 019 (deletion)
    UPDATE public.indicators
    SET progress = GREATEST(0, progress - v_step),
        status = CASE WHEN GREATEST(0, progress - v_step) >= 70 THEN 'on-track'::indicator_status
                      WHEN GREATEST(0, progress - v_step) >= 40 THEN 'at-risk'::indicator_status
                      ELSE 'behind'::indicator_status END,
        updated_at = NOW()
    WHERE nbsap_target_id = p_target;
  END IF;

  INSERT INTO public.audit_log (user_id, action_type, action, detail, role, source)
  VALUES (
    p_actor,
    CASE WHEN p_direction > 0 THEN 'progress_update' ELSE 'progress_reversed' END,
    CASE WHEN p_direction > 0 THEN 'Target progress added on publication'
         ELSE 'Target progress removed: publication withdrawn' END,
    json_build_object('target_id', p_target, 'report_id', p_report, 'tool_id', p_tool,
                      'step', v_step, 'previous_progress', v_prev, 'new_progress', v_new)::text,
    'system',
    'database'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_target_progress_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_was BOOLEAN := FALSE;
  v_now BOOLEAN;
  v_moved BOOLEAN := FALSE;
BEGIN
  v_now := NEW.status = 'approved' AND NEW.nbsap_target_id IS NOT NULL;
  IF TG_OP = 'UPDATE' THEN
    v_was := OLD.status = 'approved' AND OLD.nbsap_target_id IS NOT NULL;
    v_moved := OLD.nbsap_target_id IS DISTINCT FROM NEW.nbsap_target_id
            OR OLD.tool_id IS DISTINCT FROM NEW.tool_id;
    IF v_was AND (NOT v_now OR v_moved) THEN
      PERFORM public.shift_target_progress(OLD.nbsap_target_id, OLD.tool_id::text, -1, OLD.id, auth.uid());
    END IF;
  END IF;
  IF v_now AND (NOT v_was OR v_moved) THEN
    PERFORM public.shift_target_progress(NEW.nbsap_target_id, NEW.tool_id::text, 1, NEW.id, auth.uid());
  END IF;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.shift_target_progress(INTEGER, TEXT, INTEGER, UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.apply_target_progress_change()                           FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trigger_update_target_progress ON public.toolkit_reports;
DROP TRIGGER IF EXISTS apply_target_progress_change ON public.toolkit_reports;
CREATE TRIGGER apply_target_progress_change
  AFTER INSERT OR UPDATE ON public.toolkit_reports
  FOR EACH ROW EXECUTE FUNCTION public.apply_target_progress_change();

-- ============================================================
-- 8. EXISTING REPORTS JOIN THE WORKFLOW
-- ============================================================
-- approved -> published, rejected -> rejected, pending -> waiting at the
-- first stage of its route. No side effects (status is unchanged).

ALTER TABLE public.toolkit_reports DISABLE TRIGGER USER;
UPDATE public.toolkit_reports r
SET route = public.report_route(r.institution_id, r.district_id, r.indicator_id, r.attachments);

UPDATE public.toolkit_reports
SET workflow_status = CASE status
                        WHEN 'approved' THEN 'published'
                        WHEN 'rejected' THEN 'rejected'
                        ELSE 'submitted' END,
    current_stage_id = CASE WHEN status = 'pending' THEN route[1] END,
    published_at     = CASE WHEN status = 'approved' THEN COALESCE(reviewed_at, submitted_at) END,
    last_action      = CASE status WHEN 'approved' THEN 'publish' WHEN 'rejected' THEN 'reject' ELSE 'submit' END;
ALTER TABLE public.toolkit_reports ENABLE TRIGGER USER;

INSERT INTO public.audit_log (user_id, action_type, action, detail, role, source)
VALUES (
  NULL,
  'schema_migration',
  'Multi-level validation (040, M02)',
  'Configurable validation stages; report routes; review_report/resubmit_report; status history; status derived from publication.',
  'system',
  'database'
);

COMMIT;

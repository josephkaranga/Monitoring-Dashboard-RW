-- ============================================================
-- Migration 019: Delete cleanup triggers + role cast fix
-- 1. Fix apply_approved_role_change trigger (TEXT → user_role cast)
-- 2. Reverse target/indicator progress when an approved report is deleted
-- 3. Reverse system_metrics when an approved report is deleted
-- ============================================================

-- ── 1. Fix role cast in apply_approved_role_change trigger ───
-- role_change_requests.to_role is TEXT but profiles.role is user_role enum.
-- PL/pgSQL does not implicit-cast; we must use ::user_role explicitly.
CREATE OR REPLACE FUNCTION public.apply_approved_role_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    UPDATE public.profiles
    SET role       = NEW.to_role::user_role,
        updated_at = NOW()
    WHERE id = NEW.user_id;

    INSERT INTO public.audit_log (user_id, action_type, action, detail, role)
    VALUES (
      NEW.user_id,
      'role_updated',
      'Role changed via approval workflow',
      'Changed from ' || NEW.from_role || ' to ' || NEW.to_role
        || ' by admin ' || COALESCE(NEW.reviewed_by::text, 'system'),
      NEW.to_role
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 2. Reverse target + indicator progress on approved report deletion ──
CREATE OR REPLACE FUNCTION public.reverse_progress_on_report_delete()
RETURNS TRIGGER AS $$
DECLARE
  target_record        RECORD;
  tool_weight          DECIMAL;
  base_contribution    INTEGER := 20;
  progress_removed     INTEGER;
  new_target_progress  INTEGER;
BEGIN
  -- Only reverse progress for approved reports linked to a target
  IF OLD.status != 'approved' OR OLD.nbsap_target_id IS NULL THEN
    RETURN OLD;
  END IF;

  SELECT * INTO target_record
  FROM public.nbsap_targets
  WHERE id = OLD.nbsap_target_id;

  IF target_record IS NULL THEN
    RETURN OLD;
  END IF;

  tool_weight         := public.get_tool_weight(OLD.tool_id);
  progress_removed    := CEIL(base_contribution * tool_weight);
  new_target_progress := GREATEST(0, target_record.progress - progress_removed);

  UPDATE public.nbsap_targets
  SET progress          = new_target_progress,
      auto_update_count = GREATEST(0, COALESCE(auto_update_count, 0) - 1),
      updated_at        = NOW()
  WHERE id = OLD.nbsap_target_id;

  -- Mirror the exact update logic from the insert trigger in reverse
  UPDATE public.indicators
  SET progress   = GREATEST(0, progress - progress_removed),
      status     = CASE
                     WHEN GREATEST(0, progress - progress_removed) >= 70 THEN 'on-track'
                     WHEN GREATEST(0, progress - progress_removed) >= 40 THEN 'at-risk'
                     ELSE 'behind'
                   END,
      updated_at = NOW()
  WHERE nbsap_target_id = OLD.nbsap_target_id;

  INSERT INTO public.audit_log (user_id, action_type, action, detail)
  VALUES (
    OLD.submitted_by,
    'progress_reversed',
    'Target progress reversed due to report deletion',
    json_build_object(
      'target_id',       OLD.nbsap_target_id,
      'deleted_report',  OLD.id,
      'tool_id',         OLD.tool_id,
      'tool_weight',     tool_weight,
      'progress_removed', progress_removed,
      'old_progress',    target_record.progress,
      'new_progress',    new_target_progress
    )::text
  );

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_reverse_progress_on_delete ON public.toolkit_reports;
CREATE TRIGGER trigger_reverse_progress_on_delete
  BEFORE DELETE ON public.toolkit_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.reverse_progress_on_report_delete();

-- ── 3. Reverse system_metrics on approved report deletion ─────
-- Mirrors migration 015's update_system_metrics_from_reports() exactly,
-- but subtracts instead of adds. Districts/companies/protected_areas
-- use a COUNT(DISTINCT) recalculation (they recount from surviving rows).
CREATE OR REPLACE FUNCTION public.reverse_system_metrics_on_delete()
RETURNS TRIGGER AS $$
DECLARE
  form_data_json JSONB;
  tool_id        TEXT;
BEGIN
  IF OLD.status != 'approved' THEN
    RETURN OLD;
  END IF;

  tool_id        := OLD.tool_id;
  form_data_json := OLD.form_data::JSONB;

  -- Forest ha (T02 forest_ha, T03 coverage_change_ha, T03 restoration_ha)
  IF tool_id = 'T02' AND form_data_json ? 'forest_ha' THEN
    UPDATE public.system_metrics
    SET metric_value = GREATEST(0, metric_value - public.safe_numeric_extract(form_data_json->>'forest_ha')),
        updated_at   = NOW()
    WHERE metric_type = 'forest_ha_total';
  END IF;

  IF tool_id = 'T03' AND form_data_json ? 'coverage_change_ha' THEN
    UPDATE public.system_metrics
    SET metric_value = GREATEST(0, metric_value - public.safe_numeric_extract(form_data_json->>'coverage_change_ha')),
        updated_at   = NOW()
    WHERE metric_type = 'forest_ha_total';
  END IF;

  IF tool_id = 'T03' AND form_data_json ? 'restoration_ha' THEN
    UPDATE public.system_metrics
    SET metric_value = GREATEST(0, metric_value - public.safe_numeric_extract(form_data_json->>'restoration_ha')),
        updated_at   = NOW()
    WHERE metric_type = 'forest_ha_total';
  END IF;

  -- Restoration commitments (T06)
  IF tool_id = 'T06' AND form_data_json ? 'restoration_ha' THEN
    UPDATE public.system_metrics
    SET metric_value = GREATEST(0, metric_value - public.safe_numeric_extract(form_data_json->>'restoration_ha')),
        updated_at   = NOW()
    WHERE metric_type = 'restoration_commitments_ha';
  END IF;

  -- Wetland ha (T02)
  IF tool_id = 'T02' AND form_data_json ? 'wetland_ha' THEN
    UPDATE public.system_metrics
    SET metric_value = GREATEST(0, metric_value - public.safe_numeric_extract(form_data_json->>'wetland_ha')),
        updated_at   = NOW()
    WHERE metric_type = 'wetland_ha_total';
  END IF;

  -- Finance (T01 budget_utilized, T05 allocated + disbursed)
  IF tool_id = 'T01' AND form_data_json ? 'budget_utilized' THEN
    UPDATE public.system_metrics
    SET metric_value = GREATEST(0, metric_value - public.safe_numeric_extract(form_data_json->>'budget_utilized')),
        updated_at   = NOW()
    WHERE metric_type = 'finance_rwf_utilized';
  END IF;

  IF tool_id = 'T05' THEN
    IF form_data_json ? 'budget_allocated' THEN
      UPDATE public.system_metrics
      SET metric_value = GREATEST(0, metric_value - public.safe_numeric_extract(form_data_json->>'budget_allocated')),
          updated_at   = NOW()
      WHERE metric_type = 'finance_rwf_allocated';
    END IF;
    IF form_data_json ? 'budget_disbursed' THEN
      UPDATE public.system_metrics
      SET metric_value = GREATEST(0, metric_value - public.safe_numeric_extract(form_data_json->>'budget_disbursed')),
          updated_at   = NOW()
      WHERE metric_type = 'finance_rwf_disbursed';
    END IF;
  END IF;

  -- HWC incidents (T04 hwc_incidents, T03 illegal_cases)
  IF tool_id = 'T04' AND form_data_json ? 'hwc_incidents' THEN
    UPDATE public.system_metrics
    SET metric_value = GREATEST(0, metric_value - public.safe_numeric_extract(form_data_json->>'hwc_incidents')),
        updated_at   = NOW()
    WHERE metric_type = 'hwc_incidents_total';
  END IF;

  IF tool_id = 'T03' AND form_data_json ? 'illegal_cases' THEN
    UPDATE public.system_metrics
    SET metric_value = GREATEST(0, metric_value - public.safe_numeric_extract(form_data_json->>'illegal_cases')),
        updated_at   = NOW()
    WHERE metric_type = 'hwc_incidents_total';
  END IF;

  -- EIA compliance (T06) — decrement the relevant bucket
  IF tool_id = 'T06' AND form_data_json ? 'eia_compliance' THEN
    CASE form_data_json->>'eia_compliance'
      WHEN 'Full compliance' THEN
        UPDATE public.system_metrics
        SET metric_value = GREATEST(0, metric_value - 1), updated_at = NOW()
        WHERE metric_type = 'eia_compliance_full';
      WHEN 'Partial compliance' THEN
        UPDATE public.system_metrics
        SET metric_value = GREATEST(0, metric_value - 1), updated_at = NOW()
        WHERE metric_type = 'eia_compliance_partial';
      WHEN 'Non-compliant' THEN
        UPDATE public.system_metrics
        SET metric_value = GREATEST(0, metric_value - 1), updated_at = NOW()
        WHERE metric_type = 'eia_compliance_non';
    END CASE;
  END IF;

  -- Districts / companies / protected_areas — recalculate from remaining rows
  IF tool_id = 'T02' AND form_data_json ? 'district' THEN
    UPDATE public.system_metrics
    SET metric_value = (
      SELECT COUNT(DISTINCT form_data->>'district')
      FROM public.toolkit_reports
      WHERE tool_id = 'T02'
        AND status   = 'approved'
        AND id       != OLD.id
        AND form_data->>'district' IS NOT NULL
        AND form_data->>'district' != ''
    ),
    updated_at = NOW()
    WHERE metric_type = 'districts_reporting';
  END IF;

  IF tool_id = 'T06' AND form_data_json ? 'company' THEN
    UPDATE public.system_metrics
    SET metric_value = (
      SELECT COUNT(DISTINCT form_data->>'company')
      FROM public.toolkit_reports
      WHERE tool_id = 'T06'
        AND status   = 'approved'
        AND id       != OLD.id
        AND form_data->>'company' IS NOT NULL
        AND form_data->>'company' != ''
    ),
    updated_at = NOW()
    WHERE metric_type = 'companies_reporting';
  END IF;

  IF tool_id = 'T03' AND form_data_json ? 'area_name' THEN
    UPDATE public.system_metrics
    SET metric_value = (
      SELECT COUNT(DISTINCT form_data->>'area_name')
      FROM public.toolkit_reports
      WHERE tool_id = 'T03'
        AND status   = 'approved'
        AND id       != OLD.id
        AND form_data->>'area_name' IS NOT NULL
        AND form_data->>'area_name' != ''
    ),
    updated_at = NOW()
    WHERE metric_type = 'protected_areas_monitored';
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_reverse_metrics_on_delete ON public.toolkit_reports;
CREATE TRIGGER trigger_reverse_metrics_on_delete
  BEFORE DELETE ON public.toolkit_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.reverse_system_metrics_on_delete();

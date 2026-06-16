-- ============================================================
-- AUTOMATIC REPORTING UPDATES — WEIGHTED PROGRESS TRIGGERS
-- Enhances target progress and indicator progress calculations
-- with tool-specific weight factors (see migration 016)
-- ============================================================

-- ── 1. Enhanced update_target_progress_from_reports with tool weights ──
CREATE OR REPLACE FUNCTION public.update_target_progress_from_reports()
RETURNS TRIGGER AS $$
DECLARE
  target_record RECORD;
  tool_weight DECIMAL;
  base_contribution INTEGER := 20;
  weighted_contribution DECIMAL;
  progress_contribution INTEGER;
  previous_progress INTEGER;
  new_progress INTEGER;
BEGIN
  -- Only process if report has nbsap_target_id and is approved
  IF (NEW.nbsap_target_id IS NOT NULL AND NEW.status = 'approved') THEN

    SELECT * INTO target_record
    FROM public.nbsap_targets
    WHERE id = NEW.nbsap_target_id;

    IF target_record IS NOT NULL THEN
      tool_weight := public.get_tool_weight(NEW.tool_id);
      previous_progress := target_record.progress;
      weighted_contribution := base_contribution * tool_weight;
      progress_contribution := CEIL(weighted_contribution);
      new_progress := LEAST(100, GREATEST(0, previous_progress + progress_contribution));

      -- Update target progress and automatic update tracking
      UPDATE public.nbsap_targets
      SET progress = new_progress,
          last_auto_update = NOW(),
          auto_update_count = COALESCE(auto_update_count, 0) + 1,
          updated_at = NOW()
      WHERE id = NEW.nbsap_target_id;

      -- Update related indicators to reflect the new target progress
      UPDATE public.indicators
      SET progress = LEAST(100, GREATEST(progress, new_progress - 10)),
          status = CASE
            WHEN new_progress >= 70 THEN 'on-track'
            WHEN new_progress >= 40 THEN 'at-risk'
            ELSE 'behind'
          END,
          updated_at = NOW()
      WHERE nbsap_target_id = NEW.nbsap_target_id;

      -- Log the weighted calculation for audit purposes
      INSERT INTO public.audit_log (
        user_id, action_type, action, detail
      ) VALUES (
        NEW.submitted_by,
        'progress_update',
        'Target progress updated via tool-weighted calculation',
        json_build_object(
          'target_id', NEW.nbsap_target_id,
          'report_id', NEW.id,
          'tool_id', NEW.tool_id,
          'tool_weight', tool_weight,
          'base_contribution', base_contribution,
          'weighted_contribution', weighted_contribution,
          'progress_contribution', progress_contribution,
          'previous_progress', previous_progress,
          'new_progress', new_progress,
          'calculated_at', NOW()
        )::text
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger already exists from migration 013; ensure it points at the
-- updated function definition.
DROP TRIGGER IF EXISTS trigger_update_target_progress ON public.toolkit_reports;
CREATE TRIGGER trigger_update_target_progress
  AFTER INSERT OR UPDATE ON public.toolkit_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_target_progress_from_reports();

-- ── 2. Enhanced calculate_indicator_progress with tool weights ──────
CREATE OR REPLACE FUNCTION public.calculate_indicator_progress(
  indicator_id INTEGER,
  nbsap_target_id INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  target_progress INTEGER;
  total_weight DECIMAL;
  approved_weight DECIMAL;
  weighted_completion_rate DECIMAL;
  calculated_progress DECIMAL;
BEGIN
  -- Get current target progress
  SELECT progress INTO target_progress
  FROM public.nbsap_targets
  WHERE id = calculate_indicator_progress.nbsap_target_id;

  -- Sum tool weights for all reports linked to this target
  SELECT COALESCE(SUM(public.get_tool_weight(tr.tool_id)), 0) INTO total_weight
  FROM public.toolkit_reports tr
  WHERE tr.nbsap_target_id = calculate_indicator_progress.nbsap_target_id;

  -- Sum tool weights for approved reports linked to this target
  SELECT COALESCE(SUM(public.get_tool_weight(tr.tool_id)), 0) INTO approved_weight
  FROM public.toolkit_reports tr
  WHERE tr.nbsap_target_id = calculate_indicator_progress.nbsap_target_id
    AND tr.status = 'approved';

  -- Blend target progress (70%) with the tool-weighted completion rate (30%)
  IF total_weight > 0 THEN
    weighted_completion_rate := (approved_weight / total_weight) * 100;
    calculated_progress := (target_progress * 0.7) + (weighted_completion_rate * 0.3);
  ELSE
    calculated_progress := target_progress;
  END IF;

  RETURN GREATEST(0, LEAST(100, ROUND(calculated_progress)::INTEGER));
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.update_target_progress_from_reports() IS 'Trigger function that updates target progress using tool-weighted contributions and logs calculation details to audit_log';
COMMENT ON FUNCTION public.calculate_indicator_progress(INTEGER, INTEGER) IS 'Calculates indicator progress by blending target progress with the tool-weighted completion rate of linked reports';

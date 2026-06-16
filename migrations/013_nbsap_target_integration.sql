gis-- ============================================================
-- NBSAP TARGET INTEGRATION ENHANCEMENT
-- Add stakeholder responsibility and auto-update functionality
-- ============================================================

-- ── 1. Add responsible stakeholders field to NBSAP targets ──────
ALTER TABLE public.nbsap_targets ADD COLUMN IF NOT EXISTS responsible_stakeholders TEXT[];

-- ── 2. Add NBSAP target reference to toolkit reports ────────────
ALTER TABLE public.toolkit_reports ADD COLUMN IF NOT EXISTS nbsap_target_id INTEGER REFERENCES public.nbsap_targets(id);

-- ── 3. Update existing NBSAP targets with responsible stakeholders ──
UPDATE public.nbsap_targets SET responsible_stakeholders = CASE 
  WHEN id = 1 THEN ARRAY['REMA', 'Ministry of Environment', 'MININFRA', 'Districts']
  WHEN id = 2 THEN ARRAY['REMA', 'RFA', 'District Authorities', 'Ministry of Environment']
  WHEN id = 3 THEN ARRAY['RDB', 'REMA', 'Ministry of Environment']
  WHEN id = 4 THEN ARRAY['RDB', 'REMA', 'Conservation NGOs']
  WHEN id = 5 THEN ARRAY['MINAGRI', 'RAB', 'RFA', 'REMA']
  WHEN id = 6 THEN ARRAY['REMA', 'RDB', 'RFA', 'MINAGRI']
  WHEN id = 7 THEN ARRAY['REMA', 'MINAGRI', 'WASAC', 'Private Sector']
  WHEN id = 8 THEN ARRAY['REMA', 'Ministry of Environment', 'Districts', 'NGOs']
  WHEN id = 9 THEN ARRAY['RDB', 'Local Communities', 'Tourism Operators']
  WHEN id = 10 THEN ARRAY['MINAGRI', 'RAB', 'RFA', 'Private Sector']
  WHEN id = 11 THEN ARRAY['REMA', 'Ministry of Environment', 'Districts', 'NGOs']
  WHEN id = 12 THEN ARRAY['Districts', 'MININFRA', 'Urban Authorities']
  WHEN id = 13 THEN ARRAY['REMA', 'Private Sector', 'Research Institutions']
  WHEN id = 14 THEN ARRAY['REMA', 'All Ministries', 'Private Sector']
  WHEN id = 15 THEN ARRAY['Private Sector', 'Financial Institutions', 'REMA']
  WHEN id = 16 THEN ARRAY['Private Sector', 'Local Communities', 'REMA']
  WHEN id = 17 THEN ARRAY['REMA', 'Research Institutions', 'MINAGRI']
  WHEN id = 18 THEN ARRAY['MINECOFIN', 'REMA', 'All Ministries']
  WHEN id = 19 THEN ARRAY['MINECOFIN', 'REMA', 'Development Partners']
  WHEN id = 20 THEN ARRAY['REMA', 'Universities', 'Research Institutions']
  WHEN id = 21 THEN ARRAY['REMA', 'NISR', 'Research Institutions']
  WHEN id = 22 THEN ARRAY['REMA', 'Local Communities', 'NGOs']
  ELSE ARRAY['REMA']
END;

-- ── 4. Create function to get user's responsible targets ────────
CREATE OR REPLACE FUNCTION public.get_user_responsible_targets(user_org TEXT)
RETURNS TABLE(
  target_id INTEGER,
  title TEXT,
  description TEXT,
  goal TEXT,
  progress INTEGER,
  responsible_stakeholders TEXT[]
) AS $$
BEGIN
  -- If no organization provided, return all targets
  IF user_org IS NULL OR user_org = '' THEN
    RETURN QUERY
    SELECT nt.id, nt.title, nt.description, nt.goal::TEXT, nt.progress, nt.responsible_stakeholders
    FROM public.nbsap_targets nt
    ORDER BY nt.id;
  ELSE
    -- Return targets where user's organization is in responsible_stakeholders
    RETURN QUERY
    SELECT nt.id, nt.title, nt.description, nt.goal::TEXT, nt.progress, nt.responsible_stakeholders
    FROM public.nbsap_targets nt
    WHERE user_org = ANY(nt.responsible_stakeholders)
       OR 'All Ministries' = ANY(nt.responsible_stakeholders)
    ORDER BY nt.id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 5. Create function to auto-update target progress ──────────
CREATE OR REPLACE FUNCTION public.update_target_progress_from_reports()
RETURNS TRIGGER AS $$
DECLARE
  target_record RECORD;
  total_reports INTEGER;
  approved_reports INTEGER;
  new_progress INTEGER;
BEGIN
  -- Only process if report has nbsap_target_id and is approved
  IF (NEW.nbsap_target_id IS NOT NULL AND NEW.status = 'approved') THEN
    
    -- Get current target info
    SELECT * INTO target_record 
    FROM public.nbsap_targets 
    WHERE id = NEW.nbsap_target_id;
    
    IF target_record IS NOT NULL THEN
      -- Count total and approved reports for this target
      SELECT COUNT(*) INTO total_reports
      FROM public.toolkit_reports
      WHERE nbsap_target_id = NEW.nbsap_target_id;
      
      SELECT COUNT(*) INTO approved_reports
      FROM public.toolkit_reports
      WHERE nbsap_target_id = NEW.nbsap_target_id 
        AND status = 'approved';
      
      -- Calculate new progress based on report completion rate
      -- This is a simple calculation - you can make it more sophisticated
      IF total_reports > 0 THEN
        new_progress := LEAST(95, GREATEST(10, 
          target_record.progress + (approved_reports * 5)
        ));
        
        -- Update the target progress
        UPDATE public.nbsap_targets 
        SET progress = new_progress,
            updated_at = NOW()
        WHERE id = NEW.nbsap_target_id;
        
        -- Also update related indicators
        UPDATE public.indicators 
        SET progress = LEAST(100, GREATEST(progress, new_progress - 10)),
            status = CASE 
              WHEN new_progress >= 70 THEN 'on-track'
              WHEN new_progress >= 40 THEN 'at-risk'
              ELSE 'behind'
            END,
            updated_at = NOW()
        WHERE nbsap_target_id = NEW.nbsap_target_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── 6. Create trigger for auto-updates ─────────────────────────
DROP TRIGGER IF EXISTS trigger_update_target_progress ON public.toolkit_reports;
CREATE TRIGGER trigger_update_target_progress
  AFTER INSERT OR UPDATE ON public.toolkit_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_target_progress_from_reports();

-- ── 7. Create function to calculate indicator progress from reports ──
CREATE OR REPLACE FUNCTION public.calculate_indicator_progress(
  indicator_id INTEGER,
  nbsap_target_id INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  report_count INTEGER;
  approved_count INTEGER;
  target_progress INTEGER;
  calculated_progress INTEGER;
BEGIN
  -- Get current target progress
  SELECT progress INTO target_progress
  FROM public.nbsap_targets
  WHERE id = nbsap_target_id;
  
  -- Count reports related to this target
  SELECT COUNT(*) INTO report_count
  FROM public.toolkit_reports
  WHERE toolkit_reports.nbsap_target_id = calculate_indicator_progress.nbsap_target_id;
  
  SELECT COUNT(*) INTO approved_count
  FROM public.toolkit_reports
  WHERE toolkit_reports.nbsap_target_id = calculate_indicator_progress.nbsap_target_id
    AND status = 'approved';
  
  -- Calculate progress based on target progress and report completion
  IF report_count > 0 THEN
    calculated_progress := LEAST(100, 
      (target_progress * 0.7) + ((approved_count * 100 / report_count) * 0.3)
    );
  ELSE
    calculated_progress := target_progress;
  END IF;
  
  RETURN GREATEST(0, calculated_progress);
END;
$$ LANGUAGE plpgsql;

-- ── 8. Add index for performance ───────────────────────────────
CREATE INDEX IF NOT EXISTS idx_toolkit_reports_nbsap_target 
ON public.toolkit_reports(nbsap_target_id);

CREATE INDEX IF NOT EXISTS idx_nbsap_targets_responsible 
ON public.nbsap_targets USING gin(responsible_stakeholders);

-- ── 9. Create view for target progress with report stats ───────
CREATE OR REPLACE VIEW public.target_progress_with_reports AS
SELECT 
  nt.*,
  COALESCE(rs.total_reports, 0) as total_reports,
  COALESCE(rs.approved_reports, 0) as approved_reports,
  COALESCE(rs.pending_reports, 0) as pending_reports,
  CASE 
    WHEN COALESCE(rs.total_reports, 0) = 0 THEN 0
    ELSE ROUND((COALESCE(rs.approved_reports, 0)::FLOAT / rs.total_reports) * 100)
  END as report_completion_rate
FROM public.nbsap_targets nt
LEFT JOIN (
  SELECT 
    nbsap_target_id,
    COUNT(*) as total_reports,
    COUNT(*) FILTER (WHERE status = 'approved') as approved_reports,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_reports
  FROM public.toolkit_reports
  WHERE nbsap_target_id IS NOT NULL
  GROUP BY nbsap_target_id
) rs ON nt.id = rs.nbsap_target_id
ORDER BY nt.id;

-- ── 10. Grant permissions ──────────────────────────────────────
GRANT SELECT ON public.target_progress_with_reports TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_responsible_targets(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_indicator_progress(INTEGER, INTEGER) TO authenticated;

-- ── 11. Update RLS policies for new fields ────────────────────
-- Allow authenticated users to read targets with their responsibilities
CREATE POLICY "Authenticated users can read nbsap targets"
  ON public.nbsap_targets FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Allow users to link reports to targets they're responsible for
CREATE POLICY "Users can link reports to responsible targets"
  ON public.toolkit_reports FOR UPDATE
  USING (
    can_write() AND (
      nbsap_target_id IS NULL OR
      EXISTS (
        SELECT 1 FROM public.profiles p, public.nbsap_targets nt
        WHERE p.id = auth.uid() 
          AND nt.id = nbsap_target_id
          AND (p.organization = ANY(nt.responsible_stakeholders) OR 
               'All Ministries' = ANY(nt.responsible_stakeholders))
      )
    )
  );

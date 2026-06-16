-- ============================================================
-- COMPREHENSIVE REPORTING METRICS AUTOMATION
-- Automatic updates for all reporting tool submissions to system metrics
-- ============================================================

-- ── 1. Create comprehensive metrics tracking table ────────────────
CREATE TABLE IF NOT EXISTS public.system_metrics (
  id SERIAL PRIMARY KEY,
  metric_type TEXT NOT NULL, -- 'forest_ha', 'wetland_ha', 'finance_rwf', 'hwc_incidents', 'eia_compliance', 'districts_active'
  metric_value NUMERIC DEFAULT 0,
  source_tool TEXT, -- T01, T02, T03, etc.
  source_field TEXT, -- field name from form_data
  aggregation_type TEXT DEFAULT 'sum', -- 'sum', 'count', 'average', 'latest'
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. Initialize baseline metrics ─────────────────────────────────
INSERT INTO public.system_metrics (metric_type, metric_value, source_tool, source_field, aggregation_type) VALUES
('forest_ha_total', 0, 'multiple', 'forest_ha,coverage_change_ha,restoration_ha', 'sum'),
('wetland_ha_total', 0, 'multiple', 'wetland_ha', 'sum'),
('finance_rwf_allocated', 0, 'T05', 'budget_allocated', 'sum'),
('finance_rwf_disbursed', 0, 'T05', 'budget_disbursed', 'sum'),
('finance_rwf_utilized', 0, 'T01', 'budget_utilized', 'sum'),
('hwc_incidents_total', 0, 'T04', 'hwc_incidents', 'sum'),
('eia_compliance_full', 0, 'T06', 'eia_compliance', 'count_where_full'),
('eia_compliance_partial', 0, 'T06', 'eia_compliance', 'count_where_partial'),
('eia_compliance_non', 0, 'T06', 'eia_compliance', 'count_where_non'),
('districts_reporting', 0, 'T02', 'district', 'count_distinct'),
('companies_reporting', 0, 'T06', 'company', 'count_distinct'),
('restoration_commitments_ha', 0, 'T06', 'restoration_ha', 'sum'),
('protected_areas_monitored', 0, 'T03', 'area_name', 'count_distinct');

-- ── 3. Create function to extract numeric values safely ───────────
CREATE OR REPLACE FUNCTION public.safe_numeric_extract(input_text TEXT)
RETURNS NUMERIC AS $$
BEGIN
  IF input_text IS NULL OR input_text = '' THEN
    RETURN 0;
  END IF;
  
  -- Try to convert to numeric, return 0 if fails
  BEGIN
    RETURN input_text::NUMERIC;
  EXCEPTION WHEN others THEN
    RETURN 0;
  END;
END;
$$ LANGUAGE plpgsql;

-- ── 4. Create comprehensive metrics update function ─────────────────
CREATE OR REPLACE FUNCTION public.update_system_metrics_from_reports()
RETURNS TRIGGER AS $$
DECLARE
  form_data_json JSONB;
  tool_id TEXT;
BEGIN
  -- Only process approved reports
  IF NEW.status != 'approved' THEN
    RETURN NEW;
  END IF;

  tool_id := NEW.tool_id;
  form_data_json := NEW.form_data::JSONB;

  -- ── FOREST HECTARES TRACKING ─────────────────────────────────
  -- From T02: District Biodiversity Monitoring (forest_ha)
  IF tool_id = 'T02' AND form_data_json ? 'forest_ha' THEN
    UPDATE public.system_metrics 
    SET metric_value = metric_value + public.safe_numeric_extract(form_data_json->>'forest_ha'),
        updated_at = NOW()
    WHERE metric_type = 'forest_ha_total';
  END IF;

  -- From T03: Protected Area Monitoring (coverage_change_ha)
  IF tool_id = 'T03' AND form_data_json ? 'coverage_change_ha' THEN
    UPDATE public.system_metrics 
    SET metric_value = metric_value + public.safe_numeric_extract(form_data_json->>'coverage_change_ha'),
        updated_at = NOW()
    WHERE metric_type = 'forest_ha_total';
  END IF;

  -- From T03: Protected Area Monitoring (restoration_ha)
  IF tool_id = 'T03' AND form_data_json ? 'restoration_ha' THEN
    UPDATE public.system_metrics 
    SET metric_value = metric_value + public.safe_numeric_extract(form_data_json->>'restoration_ha'),
        updated_at = NOW()
    WHERE metric_type = 'forest_ha_total';
  END IF;

  -- From T06: Private Sector Compliance (restoration_ha)
  IF tool_id = 'T06' AND form_data_json ? 'restoration_ha' THEN
    UPDATE public.system_metrics 
    SET metric_value = metric_value + public.safe_numeric_extract(form_data_json->>'restoration_ha'),
        updated_at = NOW()
    WHERE metric_type = 'restoration_commitments_ha';
  END IF;

  -- ── WETLAND HECTARES TRACKING ─────────────────────────────────
  -- From T02: District Biodiversity Monitoring (wetland_ha)
  IF tool_id = 'T02' AND form_data_json ? 'wetland_ha' THEN
    UPDATE public.system_metrics 
    SET metric_value = metric_value + public.safe_numeric_extract(form_data_json->>'wetland_ha'),
        updated_at = NOW()
    WHERE metric_type = 'wetland_ha_total';
  END IF;

  -- ── FINANCE TRACKING (RWF) ────────────────────────────────────
  -- From T01: Budget Utilized
  IF tool_id = 'T01' AND form_data_json ? 'budget_utilized' THEN
    UPDATE public.system_metrics 
    SET metric_value = metric_value + public.safe_numeric_extract(form_data_json->>'budget_utilized'),
        updated_at = NOW()
    WHERE metric_type = 'finance_rwf_utilized';
  END IF;

  -- From T05: Budget Allocated and Disbursed
  IF tool_id = 'T05' THEN
    IF form_data_json ? 'budget_allocated' THEN
      UPDATE public.system_metrics 
      SET metric_value = metric_value + public.safe_numeric_extract(form_data_json->>'budget_allocated'),
          updated_at = NOW()
      WHERE metric_type = 'finance_rwf_allocated';
    END IF;
    
    IF form_data_json ? 'budget_disbursed' THEN
      UPDATE public.system_metrics 
      SET metric_value = metric_value + public.safe_numeric_extract(form_data_json->>'budget_disbursed'),
          updated_at = NOW()
      WHERE metric_type = 'finance_rwf_disbursed';
    END IF;
  END IF;

  -- ── HWC INCIDENTS TRACKING ────────────────────────────────────
  -- From T04: Community Biodiversity Monitoring (hwc_incidents)
  IF tool_id = 'T04' AND form_data_json ? 'hwc_incidents' THEN
    UPDATE public.system_metrics 
    SET metric_value = metric_value + public.safe_numeric_extract(form_data_json->>'hwc_incidents'),
        updated_at = NOW()
    WHERE metric_type = 'hwc_incidents_total';
  END IF;

  -- From T03: Protected Area Monitoring (illegal_cases - related to HWC)
  IF tool_id = 'T03' AND form_data_json ? 'illegal_cases' THEN
    UPDATE public.system_metrics 
    SET metric_value = metric_value + public.safe_numeric_extract(form_data_json->>'illegal_cases'),
        updated_at = NOW()
    WHERE metric_type = 'hwc_incidents_total';
  END IF;

  -- ── EIA COMPLIANCE TRACKING (T06) ─────────────────────────────
  IF tool_id = 'T06' AND form_data_json ? 'eia_compliance' THEN
    CASE form_data_json->>'eia_compliance'
      WHEN 'Full compliance' THEN
        UPDATE public.system_metrics 
        SET metric_value = metric_value + 1, updated_at = NOW()
        WHERE metric_type = 'eia_compliance_full';
      WHEN 'Partial compliance' THEN
        UPDATE public.system_metrics 
        SET metric_value = metric_value + 1, updated_at = NOW()
        WHERE metric_type = 'eia_compliance_partial';
      WHEN 'Non-compliant' THEN
        UPDATE public.system_metrics 
        SET metric_value = metric_value + 1, updated_at = NOW()
        WHERE metric_type = 'eia_compliance_non';
    END CASE;
  END IF;

  -- ── DISTRICTS TRACKING ────────────────────────────────────────
  -- Count unique districts reporting (T02)
  IF tool_id = 'T02' AND form_data_json ? 'district' THEN
    -- Use upsert pattern to count distinct districts
    UPDATE public.system_metrics 
    SET metric_value = (
      SELECT COUNT(DISTINCT form_data->>'district') 
      FROM public.toolkit_reports 
      WHERE tool_id = 'T02' 
        AND status = 'approved' 
        AND form_data->>'district' IS NOT NULL
        AND form_data->>'district' != ''
    ),
    updated_at = NOW()
    WHERE metric_type = 'districts_reporting';
  END IF;

  -- ── COMPANIES TRACKING (T06) ──────────────────────────────────
  IF tool_id = 'T06' AND form_data_json ? 'company' THEN
    UPDATE public.system_metrics 
    SET metric_value = (
      SELECT COUNT(DISTINCT form_data->>'company') 
      FROM public.toolkit_reports 
      WHERE tool_id = 'T06' 
        AND status = 'approved' 
        AND form_data->>'company' IS NOT NULL
        AND form_data->>'company' != ''
    ),
    updated_at = NOW()
    WHERE metric_type = 'companies_reporting';
  END IF;

  -- ── PROTECTED AREAS TRACKING (T03) ───────────────────────────
  IF tool_id = 'T03' AND form_data_json ? 'area_name' THEN
    UPDATE public.system_metrics 
    SET metric_value = (
      SELECT COUNT(DISTINCT form_data->>'area_name') 
      FROM public.toolkit_reports 
      WHERE tool_id = 'T03' 
        AND status = 'approved' 
        AND form_data->>'area_name' IS NOT NULL
        AND form_data->>'area_name' != ''
    ),
    updated_at = NOW()
    WHERE metric_type = 'protected_areas_monitored';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── 5. Create trigger for comprehensive metrics updates ───────────
DROP TRIGGER IF EXISTS trigger_update_system_metrics ON public.toolkit_reports;
CREATE TRIGGER trigger_update_system_metrics
  AFTER INSERT OR UPDATE ON public.toolkit_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_system_metrics_from_reports();

-- ── 6. Create function to get current system metrics ─────────────
CREATE OR REPLACE FUNCTION public.get_system_metrics()
RETURNS TABLE(
  forest_ha NUMERIC,
  wetland_ha NUMERIC,
  finance_allocated_rwf NUMERIC,
  finance_disbursed_rwf NUMERIC,
  finance_utilized_rwf NUMERIC,
  hwc_incidents INTEGER,
  eia_full_compliance INTEGER,
  eia_partial_compliance INTEGER,
  eia_non_compliance INTEGER,
  districts_active INTEGER,
  companies_active INTEGER,
  protected_areas_monitored INTEGER,
  restoration_commitments_ha NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE((SELECT metric_value FROM public.system_metrics WHERE metric_type = 'forest_ha_total'), 0)::NUMERIC,
    COALESCE((SELECT metric_value FROM public.system_metrics WHERE metric_type = 'wetland_ha_total'), 0)::NUMERIC,
    COALESCE((SELECT metric_value FROM public.system_metrics WHERE metric_type = 'finance_rwf_allocated'), 0)::NUMERIC,
    COALESCE((SELECT metric_value FROM public.system_metrics WHERE metric_type = 'finance_rwf_disbursed'), 0)::NUMERIC,
    COALESCE((SELECT metric_value FROM public.system_metrics WHERE metric_type = 'finance_rwf_utilized'), 0)::NUMERIC,
    COALESCE((SELECT metric_value FROM public.system_metrics WHERE metric_type = 'hwc_incidents_total'), 0)::INTEGER,
    COALESCE((SELECT metric_value FROM public.system_metrics WHERE metric_type = 'eia_compliance_full'), 0)::INTEGER,
    COALESCE((SELECT metric_value FROM public.system_metrics WHERE metric_type = 'eia_compliance_partial'), 0)::INTEGER,
    COALESCE((SELECT metric_value FROM public.system_metrics WHERE metric_type = 'eia_compliance_non'), 0)::INTEGER,
    COALESCE((SELECT metric_value FROM public.system_metrics WHERE metric_type = 'districts_reporting'), 0)::INTEGER,
    COALESCE((SELECT metric_value FROM public.system_metrics WHERE metric_type = 'companies_reporting'), 0)::INTEGER,
    COALESCE((SELECT metric_value FROM public.system_metrics WHERE metric_type = 'protected_areas_monitored'), 0)::INTEGER,
    COALESCE((SELECT metric_value FROM public.system_metrics WHERE metric_type = 'restoration_commitments_ha'), 0)::NUMERIC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 7. Create view for dashboard metrics integration ──────────────
CREATE OR REPLACE VIEW public.dashboard_metrics_live AS
SELECT 
  -- Forest metrics
  (SELECT metric_value FROM public.system_metrics WHERE metric_type = 'forest_ha_total') as total_forest_ha,
  (SELECT metric_value FROM public.system_metrics WHERE metric_type = 'restoration_commitments_ha') as restoration_commitments_ha,
  
  -- Wetland metrics
  (SELECT metric_value FROM public.system_metrics WHERE metric_type = 'wetland_ha_total') as total_wetland_ha,
  
  -- Finance metrics (in millions RWF for display)
  ROUND((SELECT metric_value FROM public.system_metrics WHERE metric_type = 'finance_rwf_allocated') / 1000000, 2) as finance_allocated_million_rwf,
  ROUND((SELECT metric_value FROM public.system_metrics WHERE metric_type = 'finance_rwf_disbursed') / 1000000, 2) as finance_disbursed_million_rwf,
  ROUND((SELECT metric_value FROM public.system_metrics WHERE metric_type = 'finance_rwf_utilized') / 1000000, 2) as finance_utilized_million_rwf,
  
  -- HWC and compliance metrics
  (SELECT metric_value FROM public.system_metrics WHERE metric_type = 'hwc_incidents_total') as total_hwc_incidents,
  (SELECT metric_value FROM public.system_metrics WHERE metric_type = 'eia_compliance_full') as eia_full_compliance,
  (SELECT metric_value FROM public.system_metrics WHERE metric_type = 'eia_compliance_partial') as eia_partial_compliance,
  (SELECT metric_value FROM public.system_metrics WHERE metric_type = 'eia_compliance_non') as eia_non_compliance,
  
  -- Activity metrics
  (SELECT metric_value FROM public.system_metrics WHERE metric_type = 'districts_reporting') as districts_active,
  (SELECT metric_value FROM public.system_metrics WHERE metric_type = 'companies_reporting') as companies_reporting,
  (SELECT metric_value FROM public.system_metrics WHERE metric_type = 'protected_areas_monitored') as protected_areas_monitored,
  
  -- Calculated metrics
  CASE 
    WHEN (SELECT metric_value FROM public.system_metrics WHERE metric_type = 'eia_compliance_full') + 
         (SELECT metric_value FROM public.system_metrics WHERE metric_type = 'eia_compliance_partial') + 
         (SELECT metric_value FROM public.system_metrics WHERE metric_type = 'eia_compliance_non') > 0 
    THEN ROUND(
      (SELECT metric_value FROM public.system_metrics WHERE metric_type = 'eia_compliance_full') * 100.0 / 
      NULLIF((SELECT metric_value FROM public.system_metrics WHERE metric_type = 'eia_compliance_full') + 
             (SELECT metric_value FROM public.system_metrics WHERE metric_type = 'eia_compliance_partial') + 
             (SELECT metric_value FROM public.system_metrics WHERE metric_type = 'eia_compliance_non'), 0), 
      1)
    ELSE 0 
  END as eia_compliance_percentage,
  
  -- Last updated
  (SELECT MAX(updated_at) FROM public.system_metrics) as last_updated;

-- ── 8. Create function to recalculate all metrics (for data integrity) ──
CREATE OR REPLACE FUNCTION public.recalculate_system_metrics()
RETURNS TEXT AS $$
DECLARE
  result_text TEXT := 'Metrics recalculated: ';
BEGIN
  -- Reset all metrics to 0
  UPDATE public.system_metrics SET metric_value = 0, updated_at = NOW();
  
  -- Recalculate forest hectares
  UPDATE public.system_metrics 
  SET metric_value = COALESCE((
    SELECT SUM(public.safe_numeric_extract(form_data->>'forest_ha'))
    FROM public.toolkit_reports 
    WHERE tool_id = 'T02' AND status = 'approved' AND form_data->>'forest_ha' IS NOT NULL
  ), 0) + COALESCE((
    SELECT SUM(public.safe_numeric_extract(form_data->>'coverage_change_ha'))
    FROM public.toolkit_reports 
    WHERE tool_id = 'T03' AND status = 'approved' AND form_data->>'coverage_change_ha' IS NOT NULL
  ), 0) + COALESCE((
    SELECT SUM(public.safe_numeric_extract(form_data->>'restoration_ha'))
    FROM public.toolkit_reports 
    WHERE tool_id = 'T03' AND status = 'approved' AND form_data->>'restoration_ha' IS NOT NULL
  ), 0),
  updated_at = NOW()
  WHERE metric_type = 'forest_ha_total';
  
  -- Recalculate wetland hectares
  UPDATE public.system_metrics 
  SET metric_value = COALESCE((
    SELECT SUM(public.safe_numeric_extract(form_data->>'wetland_ha'))
    FROM public.toolkit_reports 
    WHERE tool_id = 'T02' AND status = 'approved' AND form_data->>'wetland_ha' IS NOT NULL
  ), 0),
  updated_at = NOW()
  WHERE metric_type = 'wetland_ha_total';
  
  -- Recalculate finance metrics
  UPDATE public.system_metrics 
  SET metric_value = COALESCE((
    SELECT SUM(public.safe_numeric_extract(form_data->>'budget_allocated'))
    FROM public.toolkit_reports 
    WHERE tool_id = 'T05' AND status = 'approved' AND form_data->>'budget_allocated' IS NOT NULL
  ), 0),
  updated_at = NOW()
  WHERE metric_type = 'finance_rwf_allocated';
  
  UPDATE public.system_metrics 
  SET metric_value = COALESCE((
    SELECT SUM(public.safe_numeric_extract(form_data->>'budget_disbursed'))
    FROM public.toolkit_reports 
    WHERE tool_id = 'T05' AND status = 'approved' AND form_data->>'budget_disbursed' IS NOT NULL
  ), 0),
  updated_at = NOW()
  WHERE metric_type = 'finance_rwf_disbursed';
  
  UPDATE public.system_metrics 
  SET metric_value = COALESCE((
    SELECT SUM(public.safe_numeric_extract(form_data->>'budget_utilized'))
    FROM public.toolkit_reports 
    WHERE tool_id = 'T01' AND status = 'approved' AND form_data->>'budget_utilized' IS NOT NULL
  ), 0),
  updated_at = NOW()
  WHERE metric_type = 'finance_rwf_utilized';
  
  -- Recalculate HWC incidents
  UPDATE public.system_metrics 
  SET metric_value = COALESCE((
    SELECT SUM(public.safe_numeric_extract(form_data->>'hwc_incidents'))
    FROM public.toolkit_reports 
    WHERE tool_id = 'T04' AND status = 'approved' AND form_data->>'hwc_incidents' IS NOT NULL
  ), 0) + COALESCE((
    SELECT SUM(public.safe_numeric_extract(form_data->>'illegal_cases'))
    FROM public.toolkit_reports 
    WHERE tool_id = 'T03' AND status = 'approved' AND form_data->>'illegal_cases' IS NOT NULL
  ), 0),
  updated_at = NOW()
  WHERE metric_type = 'hwc_incidents_total';
  
  -- Recalculate EIA compliance
  UPDATE public.system_metrics 
  SET metric_value = COALESCE((
    SELECT COUNT(*)
    FROM public.toolkit_reports 
    WHERE tool_id = 'T06' AND status = 'approved' AND form_data->>'eia_compliance' = 'Full compliance'
  ), 0),
  updated_at = NOW()
  WHERE metric_type = 'eia_compliance_full';
  
  UPDATE public.system_metrics 
  SET metric_value = COALESCE((
    SELECT COUNT(*)
    FROM public.toolkit_reports 
    WHERE tool_id = 'T06' AND status = 'approved' AND form_data->>'eia_compliance' = 'Partial compliance'
  ), 0),
  updated_at = NOW()
  WHERE metric_type = 'eia_compliance_partial';
  
  UPDATE public.system_metrics 
  SET metric_value = COALESCE((
    SELECT COUNT(*)
    FROM public.toolkit_reports 
    WHERE tool_id = 'T06' AND status = 'approved' AND form_data->>'eia_compliance' = 'Non-compliant'
  ), 0),
  updated_at = NOW()
  WHERE metric_type = 'eia_compliance_non';
  
  -- Recalculate districts reporting
  UPDATE public.system_metrics 
  SET metric_value = COALESCE((
    SELECT COUNT(DISTINCT form_data->>'district') 
    FROM public.toolkit_reports 
    WHERE tool_id = 'T02' AND status = 'approved' 
      AND form_data->>'district' IS NOT NULL AND form_data->>'district' != ''
  ), 0),
  updated_at = NOW()
  WHERE metric_type = 'districts_reporting';
  
  -- Recalculate companies reporting
  UPDATE public.system_metrics 
  SET metric_value = COALESCE((
    SELECT COUNT(DISTINCT form_data->>'company') 
    FROM public.toolkit_reports 
    WHERE tool_id = 'T06' AND status = 'approved' 
      AND form_data->>'company' IS NOT NULL AND form_data->>'company' != ''
  ), 0),
  updated_at = NOW()
  WHERE metric_type = 'companies_reporting';
  
  -- Recalculate restoration commitments
  UPDATE public.system_metrics 
  SET metric_value = COALESCE((
    SELECT SUM(public.safe_numeric_extract(form_data->>'restoration_ha'))
    FROM public.toolkit_reports 
    WHERE tool_id = 'T06' AND status = 'approved' AND form_data->>'restoration_ha' IS NOT NULL
  ), 0),
  updated_at = NOW()
  WHERE metric_type = 'restoration_commitments_ha';
  
  -- Recalculate protected areas monitored
  UPDATE public.system_metrics 
  SET metric_value = COALESCE((
    SELECT COUNT(DISTINCT form_data->>'area_name') 
    FROM public.toolkit_reports 
    WHERE tool_id = 'T03' AND status = 'approved' 
      AND form_data->>'area_name' IS NOT NULL AND form_data->>'area_name' != ''
  ), 0),
  updated_at = NOW()
  WHERE metric_type = 'protected_areas_monitored';
  
  result_text := result_text || 'Forest, Wetland, Finance, HWC, EIA Compliance, Districts, Companies, Protected Areas';
  
  RETURN result_text;
END;
$$ LANGUAGE plpgsql;

-- ── 9. Create indexes for performance ─────────────────────────────
CREATE INDEX IF NOT EXISTS idx_system_metrics_type ON public.system_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_system_metrics_updated ON public.system_metrics(updated_at);
CREATE INDEX IF NOT EXISTS idx_toolkit_reports_tool_status ON public.toolkit_reports(tool_id, status);
CREATE INDEX IF NOT EXISTS idx_toolkit_reports_form_data_gin ON public.toolkit_reports USING gin(form_data);

-- ── 10. Grant permissions ─────────────────────────────────────────
GRANT SELECT ON public.system_metrics TO authenticated;
GRANT SELECT ON public.dashboard_metrics_live TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_system_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_system_metrics() TO authenticated;

-- ── 11. Run initial calculation ───────────────────────────────────
SELECT public.recalculate_system_metrics();

-- ── 12. Create RLS policies ───────────────────────────────────────
ALTER TABLE public.system_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read system metrics"
  ON public.system_metrics FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ── 13. Add helpful comments ──────────────────────────────────────
COMMENT ON TABLE public.system_metrics IS 'Automatically updated system-wide metrics from reporting tool submissions';
COMMENT ON FUNCTION public.update_system_metrics_from_reports() IS 'Trigger function that updates system metrics when reports are approved';
COMMENT ON FUNCTION public.get_system_metrics() IS 'Returns current system metrics in a structured format';
COMMENT ON FUNCTION public.recalculate_system_metrics() IS 'Recalculates all system metrics from scratch for data integrity';
COMMENT ON VIEW public.dashboard_metrics_live IS 'Real-time system metrics formatted for dashboard display';
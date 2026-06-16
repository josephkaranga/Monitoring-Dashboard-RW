-- ============================================================
-- TERMINOLOGY UPDATE: Indigenous Groups → Local Communities
-- Migration: 007_terminology_update.sql
-- ============================================================
-- This migration replaces all occurrences of "Indigenous Groups" 
-- with "Local Communities" throughout the system to align with 
-- current stakeholder preferences and national policy.
-- ============================================================

BEGIN;

-- ── UPDATE TOOLKIT REPORTS JSONB DATA ────────────────────────
-- Update form_data JSONB field where stakeholder_category contains "Indigenous Groups"
UPDATE public.toolkit_reports
SET form_data = jsonb_set(
  form_data,
  '{stakeholder_category}',
  '"Local Communities"'::jsonb
)
WHERE form_data->>'stakeholder_category' = 'Indigenous Groups';

-- Update any nested JSONB fields that might contain "Indigenous Groups"
-- This handles cases where the term appears in other form_data fields
UPDATE public.toolkit_reports
SET form_data = (
  SELECT jsonb_object_agg(
    key,
    CASE 
      WHEN jsonb_typeof(value) = 'string' THEN
        to_jsonb(REPLACE(value::text, '"Indigenous Groups"', '"Local Communities"'))
      ELSE value
    END
  )
  FROM jsonb_each(form_data)
)
WHERE form_data::text LIKE '%Indigenous Groups%';

-- ── UPDATE INDICATORS TABLE TEXT FIELDS ──────────────────────
-- Update definition field
UPDATE public.indicators
SET definition = REPLACE(definition, 'Indigenous Groups', 'Local Communities')
WHERE definition LIKE '%Indigenous Groups%';

-- Update data_source field
UPDATE public.indicators
SET data_source = REPLACE(data_source, 'Indigenous Groups', 'Local Communities')
WHERE data_source LIKE '%Indigenous Groups%';

-- Update name field (in case it appears there)
UPDATE public.indicators
SET name = REPLACE(name, 'Indigenous Groups', 'Local Communities')
WHERE name LIKE '%Indigenous Groups%';

-- Update target_2030 field
UPDATE public.indicators
SET target_2030 = REPLACE(target_2030, 'Indigenous Groups', 'Local Communities')
WHERE target_2030 LIKE '%Indigenous Groups%';

-- Update baseline field
UPDATE public.indicators
SET baseline = REPLACE(baseline, 'Indigenous Groups', 'Local Communities')
WHERE baseline LIKE '%Indigenous Groups%';

-- Update midterm field
UPDATE public.indicators
SET midterm = REPLACE(midterm, 'Indigenous Groups', 'Local Communities')
WHERE midterm LIKE '%Indigenous Groups%';

-- Update final_target field
UPDATE public.indicators
SET final_target = REPLACE(final_target, 'Indigenous Groups', 'Local Communities')
WHERE final_target LIKE '%Indigenous Groups%';

-- Update current_value field
UPDATE public.indicators
SET current_value = REPLACE(current_value, 'Indigenous Groups', 'Local Communities')
WHERE current_value LIKE '%Indigenous Groups%';

-- Update km_gbf field
UPDATE public.indicators
SET km_gbf = REPLACE(km_gbf, 'Indigenous Groups', 'Local Communities')
WHERE km_gbf LIKE '%Indigenous Groups%';

-- ── ADD AUDIT LOG ENTRY ──────────────────────────────────────
INSERT INTO public.audit_log (
  user_id,
  action_type,
  action,
  detail,
  role
) VALUES (
  NULL, -- System migration, no specific user
  'system_migration',
  'Terminology Update Migration',
  'Replaced all occurrences of "Indigenous Groups" with "Local Communities" in toolkit_reports (form_data JSONB) and indicators table (definition, data_source, and other text fields). Migration 007_terminology_update.sql applied successfully.',
  NULL
);

-- ── VERIFICATION ──────────────────────────────────────────────
-- Check for any remaining "Indigenous Groups" references
DO $$
DECLARE
  toolkit_count INTEGER;
  indicator_count INTEGER;
BEGIN
  -- Check toolkit_reports
  SELECT COUNT(*) INTO toolkit_count
  FROM public.toolkit_reports
  WHERE form_data::text LIKE '%Indigenous Groups%';
  
  -- Check indicators
  SELECT COUNT(*) INTO indicator_count
  FROM public.indicators
  WHERE definition LIKE '%Indigenous Groups%'
     OR data_source LIKE '%Indigenous Groups%'
     OR name LIKE '%Indigenous Groups%'
     OR target_2030 LIKE '%Indigenous Groups%'
     OR baseline LIKE '%Indigenous Groups%'
     OR midterm LIKE '%Indigenous Groups%'
     OR final_target LIKE '%Indigenous Groups%'
     OR current_value LIKE '%Indigenous Groups%'
     OR km_gbf LIKE '%Indigenous Groups%';
  
  IF toolkit_count > 0 THEN
    RAISE WARNING 'Found % toolkit_reports records still containing "Indigenous Groups"', toolkit_count;
  ELSE
    RAISE NOTICE 'Successfully updated all toolkit_reports records';
  END IF;
  
  IF indicator_count > 0 THEN
    RAISE WARNING 'Found % indicators records still containing "Indigenous Groups"', indicator_count;
  ELSE
    RAISE NOTICE 'Successfully updated all indicators records';
  END IF;
  
  RAISE NOTICE 'Terminology update migration completed successfully';
END $$;

COMMIT;

-- ============================================================
-- ROLLBACK INSTRUCTIONS (if needed)
-- ============================================================
-- To rollback this migration, run:
-- 
-- BEGIN;
-- UPDATE public.toolkit_reports
-- SET form_data = jsonb_set(
--   form_data,
--   '{stakeholder_category}',
--   '"Indigenous Groups"'::jsonb
-- )
-- WHERE form_data->>'stakeholder_category' = 'Local Communities';
-- 
-- UPDATE public.indicators
-- SET definition = REPLACE(definition, 'Local Communities', 'Indigenous Groups')
-- WHERE definition LIKE '%Local Communities%';
-- 
-- UPDATE public.indicators
-- SET data_source = REPLACE(data_source, 'Local Communities', 'Indigenous Groups')
-- WHERE data_source LIKE '%Local Communities%';
-- 
-- DELETE FROM public.audit_log
-- WHERE action_type = 'system_migration'
--   AND action = 'Terminology Update Migration';
-- COMMIT;
-- ============================================================

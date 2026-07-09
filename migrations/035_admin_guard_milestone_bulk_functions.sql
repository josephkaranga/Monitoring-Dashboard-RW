-- ============================================================
-- Migration 035: admin guards on milestone bulk-write/import
--                functions + revoke rls_auto_enable EXECUTE
-- ============================================================
-- Context: migration 033 revoked anon EXECUTE from every public
-- function and re-granted authenticated EXECUTE only where the
-- app needs it, but deliberately left a set of admin-only
-- milestone bulk-load/import functions untouched because they
-- needed internal role checks added, not a blanket revoke (any
-- authenticated user still needs the ability to call some of
-- these paths' *underlying* tables through normal RLS-governed
-- inserts — the exposure is specifically these RPC entry points
-- bypassing per-row checks via SECURITY DEFINER).
--
-- These 8 functions were never captured in any migration file —
-- they were created directly in the Supabase SQL editor. Bodies
-- below are reproduced verbatim from `pg_get_functiondef()` with
-- only an admin guard inserted after BEGIN; no other logic changed.
--
-- Disposition of each function flagged by the Advisor:
--
--   admin_delete_user
--     NO CHANGE. Already checks caller_role = 'dashboard_management'
--     internally and returns a Forbidden error object. The
--     "authenticated can execute" warning is an unavoidable
--     Supabase/Postgres limitation — GRANT/REVOKE only operate on
--     roles, and every non-anon user shares the `authenticated`
--     role, so an app-level check is the correct (and only) fix,
--     and it's already there.
--
--   rls_auto_enable
--     NO BODY CHANGE — just REVOKE EXECUTE FROM authenticated.
--     It's an event-trigger function (RETURNS event_trigger);
--     Postgres refuses to invoke those directly via a normal
--     function call, so it was never actually exploitable through
--     /rest/v1/rpc/rls_auto_enable. Revoking just silences the
--     warning by removing the (unusable) grant.
--
--   bulk_load_milestone_data, bulk_load_all_targets_milestone_data,
--   associate_milestones_with_stakeholders,
--   import_milestone_data_from_csv_format,
--   check_milestone_referential_integrity,
--   validate_milestone_timeline_data
--     REAL GAP — none of these checked the caller's role. Any
--     authenticated user could bulk-write milestones for any
--     target, reassign responsible_stakeholders on any milestone,
--     or read internal referential-integrity diagnostics. Each
--     gets `IF NOT public.is_admin() THEN RETURN QUERY SELECT
--     <forbidden row matching its own return shape>; RETURN; END IF;`
--     immediately after BEGIN, so callers get the same structured
--     error shape they already handle, not an exception.
-- ============================================================


-- ════════════════════════════════════════════════════════════
-- validate_milestone_timeline_data
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.validate_milestone_timeline_data(target_id integer, milestones_data jsonb)
 RETURNS TABLE(is_valid boolean, error_messages text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  milestone JSONB;
  errors TEXT[] := '{}';
  warnings TEXT[] := '{}';
  prev_date DATE;
  milestone_date DATE;
  stakeholder TEXT;
  target_exists BOOLEAN;
  has_blocking_errors BOOLEAN := FALSE;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN QUERY SELECT FALSE, ARRAY['Forbidden: admin access required']::TEXT[];
    RETURN;
  END IF;

  -- Check if target exists
  SELECT EXISTS(SELECT 1 FROM public.nbsap_targets WHERE id = target_id) INTO target_exists;
  IF NOT target_exists THEN
    errors := array_append(errors, 'ERROR: Target ID ' || target_id || ' does not exist');
    has_blocking_errors := TRUE;
    RETURN QUERY SELECT FALSE, errors;
    RETURN;
  END IF;

  -- Validate each milestone in the data
  FOR milestone IN SELECT jsonb_array_elements(milestones_data)
  LOOP
    -- Validate required fields
    IF NOT (milestone ? 'title') OR (milestone->>'title') = '' THEN
      errors := array_append(errors, 'ERROR: Missing or empty title in milestone');
      has_blocking_errors := TRUE;
    END IF;

    IF NOT (milestone ? 'target_date') THEN
      errors := array_append(errors, 'ERROR: Missing target_date in milestone: ' || COALESCE(milestone->>'title', 'unknown'));
      has_blocking_errors := TRUE;
    ELSE
      -- Validate date format and range
      BEGIN
        milestone_date := (milestone->>'target_date')::DATE;
        IF milestone_date < '2020-01-01' OR milestone_date > '2030-12-31' THEN
          errors := array_append(errors, 'ERROR: Invalid target_date range for milestone: ' || COALESCE(milestone->>'title', 'unknown'));
          has_blocking_errors := TRUE;
        END IF;
      EXCEPTION
        WHEN OTHERS THEN
          errors := array_append(errors, 'ERROR: Invalid target_date format for milestone: ' || COALESCE(milestone->>'title', 'unknown'));
          has_blocking_errors := TRUE;
      END;
    END IF;

    -- Validate milestone_type
    IF NOT (milestone ? 'milestone_type') OR
       (milestone->>'milestone_type') NOT IN ('baseline', 'implementation', 'completion') THEN
      errors := array_append(errors, 'ERROR: Invalid or missing milestone_type for milestone: ' || COALESCE(milestone->>'title', 'unknown'));
      has_blocking_errors := TRUE;
    END IF;

    -- Validate responsible_stakeholders array
    IF milestone ? 'responsible_stakeholders' THEN
      IF jsonb_typeof(milestone->'responsible_stakeholders') != 'array' THEN
        errors := array_append(errors, 'ERROR: responsible_stakeholders must be an array for milestone: ' || COALESCE(milestone->>'title', 'unknown'));
        has_blocking_errors := TRUE;
      ELSE
        -- Validate each stakeholder exists (warnings only, not blocking)
        FOR stakeholder IN SELECT jsonb_array_elements_text(milestone->'responsible_stakeholders')
        LOOP
          IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE role::text = stakeholder) THEN
            warnings := array_append(warnings, 'WARNING: Stakeholder role "' || stakeholder || '" not found in system for milestone: ' || COALESCE(milestone->>'title', 'unknown'));
          END IF;
        END LOOP;
      END IF;
    END IF;

    -- Validate progress value
    IF milestone ? 'progress' THEN
      BEGIN
        IF (milestone->>'progress')::INTEGER < 0 OR (milestone->>'progress')::INTEGER > 100 THEN
          errors := array_append(errors, 'ERROR: Progress must be between 0 and 100 for milestone: ' || COALESCE(milestone->>'title', 'unknown'));
          has_blocking_errors := TRUE;
        END IF;
      EXCEPTION
        WHEN OTHERS THEN
          errors := array_append(errors, 'ERROR: Invalid progress value format for milestone: ' || COALESCE(milestone->>'title', 'unknown'));
          has_blocking_errors := TRUE;
      END;
    END IF;
  END LOOP;

  -- Check chronological consistency within milestones
  prev_date := NULL;
  FOR milestone IN
    SELECT jsonb_array_elements(milestones_data)
    ORDER BY (jsonb_array_elements(milestones_data)->>'target_date')::DATE
  LOOP
    BEGIN
      milestone_date := (milestone->>'target_date')::DATE;
      IF prev_date IS NOT NULL AND milestone_date < prev_date THEN
        warnings := array_append(warnings, 'WARNING: Chronological inconsistency detected: ' ||
                 COALESCE(milestone->>'title', 'unknown') || ' has earlier date than previous milestone');
      END IF;
      prev_date := milestone_date;
    EXCEPTION
      WHEN OTHERS THEN
        -- Skip chronological check for invalid dates (already reported above)
        CONTINUE;
    END;
  END LOOP;

  -- Combine warnings with errors for reporting, but only block on errors
  errors := errors || warnings;

  -- Return validation result - only fail if there are blocking errors
  IF has_blocking_errors THEN
    RETURN QUERY SELECT FALSE, errors;
  ELSE
    RETURN QUERY SELECT TRUE, errors; -- Include warnings but still allow processing
  END IF;
END;
$function$;


-- ════════════════════════════════════════════════════════════
-- bulk_load_milestone_data
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.bulk_load_milestone_data(target_id integer, milestones_data jsonb, validate_before_insert boolean DEFAULT true)
 RETURNS TABLE(success boolean, loaded_count integer, error_messages text[], milestone_ids integer[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  validation_result RECORD;
  milestone JSONB;
  new_milestone_id INTEGER;
  loaded_milestones INTEGER[] := '{}';
  load_count INTEGER := 0;
  errors TEXT[] := '{}';
BEGIN
  IF NOT public.is_admin() THEN
    RETURN QUERY SELECT FALSE, 0, ARRAY['Forbidden: admin access required']::TEXT[], '{}'::INTEGER[];
    RETURN;
  END IF;

  -- Validate data if requested
  IF validate_before_insert THEN
    SELECT * INTO validation_result
    FROM public.validate_milestone_timeline_data(target_id, milestones_data);

    IF NOT validation_result.is_valid THEN
      RETURN QUERY SELECT FALSE, 0, validation_result.error_messages, '{}'::INTEGER[];
      RETURN;
    END IF;
  END IF;

  -- Begin transaction for bulk insert
  BEGIN
    -- Insert each milestone
    FOR milestone IN SELECT jsonb_array_elements(milestones_data)
    LOOP
      INSERT INTO public.milestones (
        nbsap_target_id,
        title,
        description,
        target_date,
        target_quarter,
        milestone_type,
        success_criteria,
        responsible_stakeholders,
        progress,
        status,
        is_critical,
        dependencies
      ) VALUES (
        target_id,
        milestone->>'title',
        COALESCE(milestone->>'description', ''),
        (milestone->>'target_date')::DATE,
        COALESCE(milestone->>'target_quarter',
                 'Q' || EXTRACT(quarter FROM (milestone->>'target_date')::DATE)::TEXT || ' ' ||
                 EXTRACT(year FROM (milestone->>'target_date')::DATE)::TEXT),
        COALESCE((milestone->>'milestone_type')::milestone_type, 'implementation'),
        CASE
          WHEN milestone ? 'success_criteria' AND jsonb_typeof(milestone->'success_criteria') = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(milestone->'success_criteria'))
          ELSE '{}'::TEXT[]
        END,
        CASE
          WHEN milestone ? 'responsible_stakeholders' AND jsonb_typeof(milestone->'responsible_stakeholders') = 'array'
          THEN ARRAY(SELECT jsonb_array_elements_text(milestone->'responsible_stakeholders'))
          ELSE '{}'::TEXT[]
        END,
        COALESCE((milestone->>'progress')::INTEGER, 0),
        COALESCE((milestone->>'status')::milestone_status, 'not_started'),
        COALESCE((milestone->>'is_critical')::BOOLEAN, FALSE),
        CASE
          WHEN milestone ? 'dependencies' AND jsonb_typeof(milestone->'dependencies') = 'array'
          THEN ARRAY(SELECT (jsonb_array_elements_text(milestone->'dependencies'))::INTEGER)
          ELSE '{}'::INTEGER[]
        END
      ) RETURNING id INTO new_milestone_id;

      loaded_milestones := array_append(loaded_milestones, new_milestone_id);
      load_count := load_count + 1;
    END LOOP;

    -- Update system metrics
    PERFORM public.recalculate_system_metrics();

    RETURN QUERY SELECT TRUE, load_count, '{}'::TEXT[], loaded_milestones;

  EXCEPTION
    WHEN OTHERS THEN
      errors := array_append(errors, 'Error during bulk insert: ' || SQLERRM);
      RETURN QUERY SELECT FALSE, 0, errors, '{}'::INTEGER[];
  END;
END;
$function$;


-- ════════════════════════════════════════════════════════════
-- bulk_load_all_targets_milestone_data
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.bulk_load_all_targets_milestone_data(all_targets_data jsonb, validate_before_insert boolean DEFAULT true)
 RETURNS TABLE(target_id integer, target_title text, success boolean, loaded_count integer, error_messages text[], milestone_ids integer[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  target_data JSONB;
  target_id_val INTEGER;
  target_title_val TEXT;
  load_result RECORD;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN QUERY SELECT NULL::INTEGER, 'Forbidden'::TEXT, FALSE, 0, ARRAY['Forbidden: admin access required']::TEXT[], '{}'::INTEGER[];
    RETURN;
  END IF;

  -- Process each target's milestone data
  FOR target_data IN SELECT jsonb_array_elements(all_targets_data)
  LOOP
    -- Extract target information
    target_id_val := (target_data->>'target_id')::INTEGER;

    -- Get target title
    SELECT title INTO target_title_val
    FROM public.nbsap_targets
    WHERE id = target_id_val;

    IF target_title_val IS NULL THEN
      target_title_val := 'Target ' || target_id_val || ' (not found)';
    END IF;

    -- Load milestones for this target
    IF target_data ? 'milestones' THEN
      SELECT * INTO load_result
      FROM public.bulk_load_milestone_data(
        target_id_val,
        target_data->'milestones',
        validate_before_insert
      );

      RETURN QUERY SELECT
        target_id_val,
        target_title_val,
        load_result.success,
        load_result.loaded_count,
        load_result.error_messages,
        load_result.milestone_ids;
    ELSE
      RETURN QUERY SELECT
        target_id_val,
        target_title_val,
        FALSE,
        0,
        ARRAY['No milestones data provided for target ' || target_id_val],
        '{}'::INTEGER[];
    END IF;
  END LOOP;
END;
$function$;


-- ════════════════════════════════════════════════════════════
-- associate_milestones_with_stakeholders
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.associate_milestones_with_stakeholders(milestone_stakeholder_mappings jsonb)
 RETURNS TABLE(milestone_id integer, milestone_title text, success boolean, added_stakeholders text[], error_message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  mapping JSONB;
  m_id INTEGER;
  m_title TEXT;
  new_stakeholders TEXT[];
  existing_stakeholders TEXT[];
  combined_stakeholders TEXT[];
  stakeholder TEXT;
  error_msg TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN QUERY SELECT NULL::INTEGER, 'Forbidden'::TEXT, FALSE, '{}'::TEXT[], 'Forbidden: admin access required'::TEXT;
    RETURN;
  END IF;

  -- Process each milestone-stakeholder mapping
  FOR mapping IN SELECT jsonb_array_elements(milestone_stakeholder_mappings)
  LOOP
    m_id := (mapping->>'milestone_id')::INTEGER;
    error_msg := NULL;
    new_stakeholders := '{}';

    -- Get milestone title
    SELECT title, responsible_stakeholders
    INTO m_title, existing_stakeholders
    FROM public.milestones
    WHERE id = m_id;

    IF m_title IS NULL THEN
      RETURN QUERY SELECT
        m_id,
        'Milestone not found',
        FALSE,
        '{}'::TEXT[],
        'Milestone ID ' || m_id || ' does not exist';
      CONTINUE;
    END IF;

    -- Extract stakeholders from mapping
    IF mapping ? 'stakeholders' AND jsonb_typeof(mapping->'stakeholders') = 'array' THEN
      new_stakeholders := ARRAY(SELECT jsonb_array_elements_text(mapping->'stakeholders'));
    ELSE
      RETURN QUERY SELECT
        m_id,
        m_title,
        FALSE,
        '{}'::TEXT[],
        'Invalid or missing stakeholders array for milestone ' || m_id;
      CONTINUE;
    END IF;

    -- Validate stakeholders exist (warning only) - cast role to text for comparison
    FOR stakeholder IN SELECT unnest(new_stakeholders)
    LOOP
      IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE role::text = stakeholder) THEN
        error_msg := COALESCE(error_msg, '') || 'Warning: Stakeholder role "' || stakeholder || '" not found in system. ';
      END IF;
    END LOOP;

    -- Combine with existing stakeholders (remove duplicates)
    combined_stakeholders := array(
      SELECT DISTINCT unnest(COALESCE(existing_stakeholders, '{}') || new_stakeholders)
    );

    -- Update milestone with new stakeholder assignments
    BEGIN
      UPDATE public.milestones
      SET responsible_stakeholders = combined_stakeholders,
          updated_at = NOW()
      WHERE id = m_id;

      RETURN QUERY SELECT
        m_id,
        m_title,
        TRUE,
        new_stakeholders,
        error_msg;

    EXCEPTION
      WHEN OTHERS THEN
        RETURN QUERY SELECT
          m_id,
          m_title,
          FALSE,
          new_stakeholders,
          'Error updating stakeholders: ' || SQLERRM;
    END;
  END LOOP;
END;
$function$;


-- ════════════════════════════════════════════════════════════
-- import_milestone_data_from_csv_format
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.import_milestone_data_from_csv_format(csv_data text, target_id integer DEFAULT NULL::integer)
 RETURNS TABLE(success boolean, processed_rows integer, loaded_milestones integer, error_messages text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  csv_lines TEXT[];
  header_line TEXT;
  data_line TEXT;
  row_count INTEGER := 0;
  loaded_count INTEGER := 0;
  errors TEXT[] := '{}';
  milestone_json JSONB;
  milestones_array JSONB := '[]'::JSONB;
  columns TEXT[];
  values TEXT[];
  i INTEGER;
  current_target_id INTEGER;
  load_result RECORD;
BEGIN
  IF NOT public.is_admin() THEN
    RETURN QUERY SELECT FALSE, 0, 0, ARRAY['Forbidden: admin access required']::TEXT[];
    RETURN;
  END IF;

  -- Split CSV into lines
  csv_lines := string_to_array(csv_data, E'\n');

  IF array_length(csv_lines, 1) < 2 THEN
    errors := array_append(errors, 'CSV data must have at least a header and one data row');
    RETURN QUERY SELECT FALSE, 0, 0, errors;
    RETURN;
  END IF;

  -- Parse header
  header_line := csv_lines[1];
  columns := string_to_array(replace(header_line, '"', ''), ',');

  -- Process each data line
  FOR i IN 2..array_length(csv_lines, 1)
  LOOP
    data_line := csv_lines[i];

    -- Skip empty lines
    IF trim(data_line) = '' THEN
      CONTINUE;
    END IF;

    row_count := row_count + 1;
    values := string_to_array(replace(data_line, '"', ''), ',');

    -- Build milestone JSON object
    milestone_json := '{}'::JSONB;

    FOR j IN 1..least(array_length(columns, 1), array_length(values, 1))
    LOOP
      -- Map CSV columns to milestone fields
      CASE lower(trim(columns[j]))
        WHEN 'target_id' THEN
          current_target_id := COALESCE(values[j]::INTEGER, target_id);
        WHEN 'title' THEN
          milestone_json := milestone_json || jsonb_build_object('title', trim(values[j]));
        WHEN 'description' THEN
          milestone_json := milestone_json || jsonb_build_object('description', trim(values[j]));
        WHEN 'target_date' THEN
          milestone_json := milestone_json || jsonb_build_object('target_date', trim(values[j]));
        WHEN 'milestone_type' THEN
          milestone_json := milestone_json || jsonb_build_object('milestone_type', trim(values[j]));
        WHEN 'is_critical' THEN
          milestone_json := milestone_json || jsonb_build_object('is_critical',
            lower(trim(values[j])) IN ('true', 't', '1', 'yes'));
        WHEN 'responsible_stakeholders' THEN
          -- Split comma-separated stakeholders
          milestone_json := milestone_json || jsonb_build_object('responsible_stakeholders',
            to_jsonb(string_to_array(trim(values[j]), ';')));
        WHEN 'success_criteria' THEN
          -- Split semicolon-separated criteria
          milestone_json := milestone_json || jsonb_build_object('success_criteria',
            to_jsonb(string_to_array(trim(values[j]), ';')));
        ELSE
          -- Skip unknown columns
          NULL;
      END CASE;
    END LOOP;

    -- Use current target_id (from CSV or parameter)
    IF current_target_id IS NOT NULL THEN
      -- Load milestone for current target
      BEGIN
        SELECT * INTO load_result
        FROM public.bulk_load_milestone_data(
          current_target_id,
          jsonb_build_array(milestone_json),
          TRUE
        );

        IF load_result.success THEN
          loaded_count := loaded_count + load_result.loaded_count;
        ELSE
          errors := errors || load_result.error_messages;
        END IF;
      EXCEPTION
        WHEN OTHERS THEN
          errors := array_append(errors, 'Error processing row ' || row_count || ': ' || SQLERRM);
      END;
    ELSE
      errors := array_append(errors, 'Row ' || row_count || ': No target_id specified');
    END IF;
  END LOOP;

  RETURN QUERY SELECT
    (array_length(errors, 1) = 0),
    row_count,
    loaded_count,
    errors;
END;
$function$;


-- ════════════════════════════════════════════════════════════
-- check_milestone_referential_integrity
-- ════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.check_milestone_referential_integrity()
 RETURNS TABLE(check_type text, issue_count integer, details text[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  orphaned_milestones INTEGER;
  invalid_dependencies INTEGER;
  missing_targets TEXT[];
  invalid_deps TEXT[];
  invalid_reports INTEGER;
  invalid_report_details TEXT[];
BEGIN
  IF NOT public.is_admin() THEN
    RETURN QUERY SELECT 'forbidden'::TEXT, 0, ARRAY['Forbidden: admin access required']::TEXT[];
    RETURN;
  END IF;

  -- Check for milestones with invalid target references
  SELECT COUNT(*), ARRAY_AGG('Milestone ' || m.id || ' (' || m.title || ') references non-existent target ' || m.nbsap_target_id)
  INTO orphaned_milestones, missing_targets
  FROM public.milestones m
  LEFT JOIN public.nbsap_targets nt ON m.nbsap_target_id = nt.id
  WHERE nt.id IS NULL;

  RETURN QUERY SELECT
    'orphaned_milestones',
    orphaned_milestones,
    COALESCE(missing_targets, '{}');

  -- Check for invalid milestone dependencies
  SELECT COUNT(*), ARRAY_AGG('Milestone ' || m.id || ' (' || m.title || ') has invalid dependency: ' || dep)
  INTO invalid_dependencies, invalid_deps
  FROM public.milestones m,
       unnest(COALESCE(m.dependencies, '{}')) as dep
  WHERE NOT EXISTS (SELECT 1 FROM public.milestones m2 WHERE m2.id = dep);

  RETURN QUERY SELECT
    'invalid_dependencies',
    invalid_dependencies,
    COALESCE(invalid_deps, '{}');

  -- Check for reports with invalid milestone references
  SELECT COUNT(*), ARRAY_AGG('Report ' || tr.id || ' references non-existent milestone ' || tr.milestone_id)
  INTO invalid_reports, invalid_report_details
  FROM public.toolkit_reports tr
  LEFT JOIN public.milestones m ON tr.milestone_id = m.id
  WHERE tr.milestone_id IS NOT NULL AND m.id IS NULL;

  RETURN QUERY SELECT
    'invalid_report_milestones',
    invalid_reports,
    COALESCE(invalid_report_details, '{}');

  -- Check for circular dependencies (simple check)
  WITH RECURSIVE milestone_deps AS (
    SELECT id, dependencies, ARRAY[id] as path
    FROM public.milestones
    WHERE dependencies IS NOT NULL AND array_length(dependencies, 1) > 0

    UNION ALL

    SELECT m.id, m.dependencies, md.path || m.id
    FROM public.milestones m
    INNER JOIN milestone_deps md ON m.id = ANY(md.dependencies)
    WHERE m.id != ALL(md.path)
  )
  SELECT COUNT(*), ARRAY_AGG('Circular dependency detected in path: ' || array_to_string(path, ' -> '))
  INTO invalid_dependencies, invalid_deps
  FROM milestone_deps
  WHERE id = ANY(path[2:]);

  RETURN QUERY SELECT
    'circular_dependencies',
    invalid_dependencies,
    COALESCE(invalid_deps, '{}');
END;
$function$;


-- ════════════════════════════════════════════════════════════
-- rls_auto_enable — event trigger, unreachable via RPC; revoke only
-- ════════════════════════════════════════════════════════════
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM authenticated;


DO $$
BEGIN
  RAISE NOTICE 'Migration 035 complete.';
  RAISE NOTICE '  - is_admin() guard added to 6 milestone bulk-write/import functions.';
  RAISE NOTICE '  - rls_auto_enable EXECUTE revoked from authenticated (event trigger, unreachable via RPC anyway).';
  RAISE NOTICE '  - admin_delete_user left unchanged (already guarded internally).';
END $$;

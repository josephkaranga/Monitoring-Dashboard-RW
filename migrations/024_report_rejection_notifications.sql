-- ============================================================
-- Migration 024: Auto-notify submitter on report rejection
--
-- The notifications table RLS policy only allows admins
-- (dashboard_management) or the notification's own user to
-- insert a row. Reviewers with canApproveReports (e.g.
-- lead_government_ministry_reporting) are not admins, so a
-- client-side insert of a notification for the submitter would
-- be silently rejected by RLS.
--
-- A SECURITY DEFINER trigger on toolkit_reports sidesteps this:
-- it fires for any reviewer/role and any code path (UI, future
-- API, manual SQL), and is the single source of truth for this
-- notification — no client-side call needed.
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_on_report_rejection()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'rejected' AND OLD.status IS DISTINCT FROM 'rejected' AND NEW.submitted_by IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, action_tab, action_label)
    VALUES (
      NEW.submitted_by,
      NEW.tool_name || ' submission rejected',
      CASE
        WHEN NEW.review_note IS NOT NULL AND NEW.review_note <> ''
          THEN 'Your ' || COALESCE(NEW.period, '') || ' submission was rejected: ' || NEW.review_note
        ELSE 'Your ' || COALESCE(NEW.period, '') || ' submission was rejected. Please review and resubmit.'
      END,
      'error',
      'reporting-toolkit',
      'Review & resubmit'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_on_report_rejection ON public.toolkit_reports;
CREATE TRIGGER trg_notify_on_report_rejection
  AFTER UPDATE ON public.toolkit_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_report_rejection();

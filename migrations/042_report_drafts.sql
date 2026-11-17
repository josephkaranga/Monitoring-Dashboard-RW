-- ============================================================
-- M03 — DRAFTS AND AUTO-SAVE
-- Migration: 042_report_drafts.sql
-- Source: "NBSAP Monitoring System: status and development
--          requirements" (4 Nov 2026), module M03.
--
-- Done when (PDF): closing the browser mid-form loses at most 5 minutes
-- of work. Drafts are saved to the server (on field change, debounced,
-- and every 5 minutes), resume on any device, and show their status in
-- the toolkit.
--
-- Drafts live in their own private table, not in toolkit_reports, so a
-- draft never appears in counts, validation queues, progress or the
-- public pipeline. Submitting a draft creates the report through the
-- normal path (all M01/M02 rules apply) and then deletes the draft.
--
-- version: optimistic concurrency. Each save names the version it was
-- based on; a save based on an older version changes nothing, so two
-- devices editing the same draft cannot silently overwrite each other.
-- ============================================================

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.validation_stages') IS NULL THEN
    RAISE EXCEPTION 'Migration 042 needs 040 (multi-level validation). Apply 037-041 first.';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.report_drafts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tool_id     report_type NOT NULL,
  form_data   JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Evidence already uploaded to storage (name, ext, size, storage_path,
  -- evidence_type, description). File contents are never stored here.
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  version     INTEGER NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT report_drafts_size CHECK (pg_column_size(form_data) + pg_column_size(attachments) < 262144),
  CONSTRAINT report_drafts_no_file_contents CHECK (attachments::text NOT LIKE '%"data_url"%')
);

CREATE INDEX IF NOT EXISTS idx_report_drafts_user ON public.report_drafts(user_id, updated_at DESC);

COMMENT ON TABLE public.report_drafts IS
'M03 drafts: private to their author, never counted or validated. Submitting creates a toolkit_reports row through the normal rules and deletes the draft.';

CREATE OR REPLACE FUNCTION public.guard_report_draft()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF v_uid IS NOT NULL THEN
      NEW.user_id := v_uid;  -- nobody creates drafts for someone else
    END IF;
    IF (SELECT count(*) FROM public.report_drafts WHERE user_id = NEW.user_id) >= 50 THEN
      RAISE EXCEPTION 'You have 50 drafts; submit or delete some before starting another'
        USING ERRCODE = '23514';
    END IF;
    NEW.version    := 1;
    NEW.created_at := NOW();
  ELSE
    NEW.user_id    := OLD.user_id;
    NEW.tool_id    := OLD.tool_id;
    NEW.created_at := OLD.created_at;
    NEW.version    := OLD.version + 1;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_report_draft() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS guard_report_draft ON public.report_drafts;
CREATE TRIGGER guard_report_draft
  BEFORE INSERT OR UPDATE ON public.report_drafts
  FOR EACH ROW EXECUTE FUNCTION public.guard_report_draft();

ALTER TABLE public.report_drafts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.report_drafts FROM anon;

DROP POLICY IF EXISTS "Authors manage own drafts" ON public.report_drafts;
CREATE POLICY "Authors manage own drafts" ON public.report_drafts
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Evidence attached to a draft is uploaded straight away under
-- <user>/drafts/<draft>/..., so a draft resumed on another device keeps
-- its files. Authors may delete those files when they discard a draft.
DO $$
BEGIN
  IF to_regclass('storage.objects') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "Authors delete own draft evidence" ON storage.objects';
    EXECUTE $p$
      CREATE POLICY "Authors delete own draft evidence" ON storage.objects
        FOR DELETE USING (
          bucket_id = 'report-attachments'
          AND name LIKE auth.uid()::text || '/drafts/%'
        )
    $p$;
  END IF;
END $$;

COMMIT;

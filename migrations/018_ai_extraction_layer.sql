-- ============================================================
-- Migration 018: AI Extraction Layer
-- Adds async AI analysis tables for the report review workflow.
-- Existing tables, triggers, and workflows are NOT modified.
-- ============================================================

-- ── ai_extractions ─────────────────────────────────────────
-- One row per toolkit_report. Stores the full AI analysis result.
CREATE TABLE IF NOT EXISTS public.ai_extractions (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  report_id           UUID        NOT NULL REFERENCES public.toolkit_reports(id) ON DELETE CASCADE,
  status              TEXT        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending','processing','complete','failed')),
  raw_text_analyzed   TEXT,                -- combined form-field text sent to AI
  document_text       TEXT,                -- text extracted from uploaded files
  extraction_result   JSONB       NOT NULL DEFAULT '{}',  -- full structured AI response
  error_message       TEXT,
  processing_time_ms  INTEGER,
  model_used          TEXT        DEFAULT 'claude-sonnet-4-20250514',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── ai_extraction_proposals ─────────────────────────────────
-- One row per proposed update from an extraction.
-- Multiple proposals per extraction; reviewers approve/reject each one.
CREATE TABLE IF NOT EXISTS public.ai_extraction_proposals (
  id               UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  extraction_id    UUID        NOT NULL REFERENCES public.ai_extractions(id) ON DELETE CASCADE,
  report_id        UUID        NOT NULL REFERENCES public.toolkit_reports(id) ON DELETE CASCADE,
  proposal_type    TEXT        NOT NULL
                               CHECK (proposal_type IN (
                                 'target_progress',
                                 'indicator_value',
                                 'milestone_status',
                                 'target_association',
                                 'budget_update',
                                 'geographic_update'
                               )),
  target_id        INTEGER     REFERENCES public.nbsap_targets(id),
  indicator_id     INTEGER     REFERENCES public.indicators(id),
  -- proposed_value: JSON string — e.g. '{"progress":65}' or '{"current_value":"65%"}'
  proposed_value   TEXT        NOT NULL,
  -- current_value: snapshot of the value at extraction time, for reviewer context
  current_value    TEXT,
  confidence_score DECIMAL(3,2) CHECK (confidence_score BETWEEN 0.0 AND 1.0),
  reasoning        TEXT,        -- AI explanation for this proposal
  source_field     TEXT,        -- which form field triggered this proposal
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','approved','rejected','modified')),
  reviewer_id      UUID        REFERENCES public.profiles(id),
  reviewed_at      TIMESTAMPTZ,
  reviewer_note    TEXT,
  -- modified_value: set by reviewer if they choose "Modify" instead of approve as-is
  modified_value   TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Indexes ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ai_extractions_report_id
  ON public.ai_extractions(report_id);

CREATE INDEX IF NOT EXISTS idx_ai_extractions_status
  ON public.ai_extractions(status);

CREATE INDEX IF NOT EXISTS idx_ai_proposals_extraction_id
  ON public.ai_extraction_proposals(extraction_id);

CREATE INDEX IF NOT EXISTS idx_ai_proposals_report_id
  ON public.ai_extraction_proposals(report_id);

CREATE INDEX IF NOT EXISTS idx_ai_proposals_status
  ON public.ai_extraction_proposals(status);

CREATE INDEX IF NOT EXISTS idx_ai_proposals_type
  ON public.ai_extraction_proposals(proposal_type);

-- ── updated_at auto-touch ────────────────────────────────────
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ai_extractions_updated_at
  BEFORE UPDATE ON public.ai_extractions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TRIGGER trg_ai_proposals_updated_at
  BEFORE UPDATE ON public.ai_extraction_proposals
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE public.ai_extractions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_extraction_proposals ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all extractions (reviewer flow)
CREATE POLICY "ai_extractions_read" ON public.ai_extractions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "ai_extractions_insert" ON public.ai_extractions
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "ai_extractions_update" ON public.ai_extractions
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "ai_proposals_read" ON public.ai_extraction_proposals
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "ai_proposals_insert" ON public.ai_extraction_proposals
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "ai_proposals_update" ON public.ai_extraction_proposals
  FOR UPDATE TO authenticated USING (true);

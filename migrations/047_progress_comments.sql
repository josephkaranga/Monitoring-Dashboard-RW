-- ============================================================
-- PROGRESS COMMENTS & STAKEHOLDER FEEDBACK
-- Migration: 047_progress_comments.sql
-- Enables users and stakeholders to comment on target progress
-- and indicator progress reporting.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.progress_comments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_id       INTEGER REFERENCES public.nbsap_targets(id) ON DELETE CASCADE,
  indicator_id    INTEGER REFERENCES public.indicators(id) ON DELETE SET NULL,
  author_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_name     TEXT NOT NULL,
  author_role     TEXT,
  author_org      TEXT,
  category        TEXT NOT NULL DEFAULT 'progress_update', -- 'progress_update', 'bottleneck', 'milestone', 'general'
  content         TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_progress_comments_target ON public.progress_comments(target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_progress_comments_indicator ON public.progress_comments(indicator_id, created_at DESC);

ALTER TABLE public.progress_comments ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view progress comments
DROP POLICY IF EXISTS "Anyone can view progress comments" ON public.progress_comments;
CREATE POLICY "Anyone can view progress comments" ON public.progress_comments
  FOR SELECT TO authenticated USING (true);

-- Authenticated users can insert progress comments
DROP POLICY IF EXISTS "Authenticated users can post comments" ON public.progress_comments;
CREATE POLICY "Authenticated users can post comments" ON public.progress_comments
  FOR INSERT TO authenticated WITH CHECK (true);

-- Authors or admins can update or delete their comments
DROP POLICY IF EXISTS "Authors or admins can modify comments" ON public.progress_comments;
CREATE POLICY "Authors or admins can modify comments" ON public.progress_comments
  FOR ALL TO authenticated
  USING (
    author_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'dashboard_management')
  );

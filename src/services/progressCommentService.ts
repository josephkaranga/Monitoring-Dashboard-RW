import { supabase } from '../utils/supabase';

export type CommentCategory = 'progress_update' | 'bottleneck' | 'milestone' | 'general';

export interface ProgressComment {
  id: string;
  target_id: number;
  indicator_id?: number | null;
  author_id?: string | null;
  author_name: string;
  author_role?: string | null;
  author_org?: string | null;
  category: CommentCategory;
  content: string;
  created_at: string;
}

const LOCAL_STORAGE_KEY = 'nbsap_progress_comments_v1';

function getLocalComments(): ProgressComment[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalComments(comments: ProgressComment[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(comments));
  } catch {
    // Ignore storage quota errors
  }
}

export async function fetchProgressComments(
  targetId: number,
  indicatorId?: number
): Promise<ProgressComment[]> {
  try {
    let query = supabase
      .from('progress_comments')
      .select('*')
      .eq('target_id', targetId)
      .order('created_at', { ascending: false });

    if (indicatorId) {
      query = query.eq('indicator_id', indicatorId);
    }

    const { data, error } = await query;
    if (error || !data) {
      // Fallback to local storage if table is not yet migrated in Supabase
      const local = getLocalComments().filter(
        (c) => c.target_id === targetId && (!indicatorId || c.indicator_id === indicatorId)
      );
      return local;
    }

    // Merge with any offline local comments
    const local = getLocalComments().filter(
      (c) => c.target_id === targetId && (!indicatorId || c.indicator_id === indicatorId)
    );
    const existingIds = new Set(data.map((d: ProgressComment) => d.id));
    const merged = [...data, ...local.filter((l) => !existingIds.has(l.id))];
    merged.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    return merged;
  } catch {
    return getLocalComments().filter(
      (c) => c.target_id === targetId && (!indicatorId || c.indicator_id === indicatorId)
    );
  }
}

export async function addProgressComment(params: {
  target_id: number;
  indicator_id?: number | null;
  author_id?: string | null;
  author_name: string;
  author_role?: string | null;
  author_org?: string | null;
  category?: CommentCategory;
  content: string;
}): Promise<ProgressComment> {
  const newComment: ProgressComment = {
    id: `comm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    target_id: params.target_id,
    indicator_id: params.indicator_id ?? null,
    author_id: params.author_id ?? null,
    author_name: params.author_name || 'Anonymous Contributor',
    author_role: params.author_role ?? null,
    author_org: params.author_org ?? null,
    category: params.category || 'progress_update',
    content: params.content.trim(),
    created_at: new Date().toISOString(),
  };

  // Save to local storage first (optimistic)
  const current = getLocalComments();
  saveLocalComments([newComment, ...current]);

  try {
    const { data, error } = await supabase
      .from('progress_comments')
      .insert({
        target_id: newComment.target_id,
        indicator_id: newComment.indicator_id,
        author_id: newComment.author_id,
        author_name: newComment.author_name,
        author_role: newComment.author_role,
        author_org: newComment.author_org,
        category: newComment.category,
        content: newComment.content,
      })
      .select()
      .single();

    if (!error && data) {
      return data as ProgressComment;
    }
  } catch {
    // If Supabase table is not yet created, return local object
  }

  return newComment;
}

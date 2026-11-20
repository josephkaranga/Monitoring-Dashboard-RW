import React, { useEffect, useState } from 'react';
import {
  fetchProgressComments,
  addProgressComment,
  type ProgressComment,
  type CommentCategory,
} from '../services/progressCommentService';
import { useAuth } from '../services/AuthContext';
import toast from 'react-hot-toast';

interface Props {
  targetId: number;
  indicatorId?: number;
  targetTitle?: string;
}

const CATEGORY_META: Record<
  CommentCategory,
  { label: string; color: string; bg: string; icon: string }
> = {
  progress_update: {
    label: 'Progress Update',
    color: '#16a34a',
    bg: '#f0fdf4',
    icon: 'fa-arrow-trend-up',
  },
  bottleneck: {
    label: 'Bottleneck / Risk',
    color: '#e11d48',
    bg: '#fff1f2',
    icon: 'fa-triangle-exclamation',
  },
  milestone: {
    label: 'Milestone Reached',
    color: '#2563eb',
    bg: '#eff6ff',
    icon: 'fa-flag-checkered',
  },
  general: { label: 'General Remark', color: '#64748b', bg: '#f8fafc', icon: 'fa-comment' },
};

export function ProgressCommentSection({ targetId, indicatorId, targetTitle }: Props) {
  const { user } = useAuth();
  const [comments, setComments] = useState<ProgressComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<CommentCategory | 'all'>('all');

  const [category, setCategory] = useState<CommentCategory>('progress_update');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchProgressComments(targetId, indicatorId)
      .then(res => {
        if (mounted) {
          setComments(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [targetId, indicatorId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      toast.error('Please write a comment before posting');
      return;
    }

    setIsSubmitting(true);
    try {
      const authorName = user?.full_name || user?.email?.split('@')[0] || 'Stakeholder';
      const authorRole = user?.role || 'Sector Reporter';
      const authorOrg = user?.organization || 'National Stakeholder';

      const created = await addProgressComment({
        target_id: targetId,
        indicator_id: indicatorId,
        author_id: user?.id,
        author_name: authorName,
        author_role: authorRole,
        author_org: authorOrg,
        category,
        content: content.trim(),
      });

      setComments(prev => [created, ...prev]);
      setContent('');
      toast.success('Comment added to reporting progress');
    } catch {
      toast.error('Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredComments =
    activeFilter === 'all' ? comments : comments.filter(c => c.category === activeFilter);

  return (
    <div
      style={{
        marginTop: 16,
        padding: 16,
        background: '#f8fafc',
        borderRadius: 10,
        border: '1px solid #e2e8f0',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="fa-solid fa-comments" style={{ color: '#1b6ca8' }} />
          <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#0f172a' }}>
            Progress Commentary & Feedback ({comments.length})
          </h4>
          {targetTitle && (
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>· Target {targetId}</span>
          )}
        </div>

        <button
          type="button"
          style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {expanded ? 'Hide Comments' : 'View & Add Comments'}
          <span className={`fa-solid fa-chevron-${expanded ? 'up' : 'down'}`} />
        </button>
      </div>

      {expanded && (
        <div style={{ marginTop: 14 }}>
          {/* Post Form */}
          <form onSubmit={handleSubmit} style={{ marginBottom: 18 }}>
            <div style={{ marginBottom: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {(Object.keys(CATEGORY_META) as CommentCategory[]).map(catKey => {
                const meta = CATEGORY_META[catKey];
                const active = category === catKey;
                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => setCategory(catKey)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 16,
                      fontSize: '0.73rem',
                      fontWeight: 600,
                      border: `1.5px solid ${active ? meta.color : '#e2e8f0'}`,
                      background: active ? meta.bg : '#fff',
                      color: active ? meta.color : '#64748b',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                    }}
                  >
                    <span className={`fa-solid ${meta.icon}`} />
                    {meta.label}
                  </button>
                );
              })}
            </div>

            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Add an update on implementation progress, bottlenecks, or achievements..."
              rows={2}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 8,
                border: '1.5px solid #cbd5e1',
                fontSize: '0.83rem',
                fontFamily: 'inherit',
                outline: 'none',
                resize: 'vertical',
                background: '#ffffff',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
              <button
                type="submit"
                disabled={isSubmitting || !content.trim()}
                style={{
                  padding: '6px 16px',
                  background: isSubmitting || !content.trim() ? '#94a3b8' : '#1b6ca8',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: isSubmitting || !content.trim() ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {isSubmitting && <span className="fa-solid fa-spinner fa-spin" />}
                Post Progress Comment
              </button>
            </div>
          </form>

          {/* Filter Bar */}
          {comments.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: 6,
                marginBottom: 12,
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: 8,
              }}
            >
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                style={{
                  padding: '3px 8px',
                  fontSize: '0.7rem',
                  fontWeight: activeFilter === 'all' ? 700 : 500,
                  border: 'none',
                  background: activeFilter === 'all' ? '#e2e8f0' : 'transparent',
                  color: '#1e293b',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                All ({comments.length})
              </button>
              {(Object.keys(CATEGORY_META) as CommentCategory[]).map(catKey => {
                const count = comments.filter(c => c.category === catKey).length;
                if (count === 0) return null;
                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => setActiveFilter(catKey)}
                    style={{
                      padding: '3px 8px',
                      fontSize: '0.7rem',
                      fontWeight: activeFilter === catKey ? 700 : 500,
                      border: 'none',
                      background:
                        activeFilter === catKey ? CATEGORY_META[catKey].bg : 'transparent',
                      color: CATEGORY_META[catKey].color,
                      borderRadius: 4,
                      cursor: 'pointer',
                    }}
                  >
                    {CATEGORY_META[catKey].label} ({count})
                  </button>
                );
              })}
            </div>
          )}

          {/* Comments List */}
          {loading ? (
            <div
              style={{
                textAlign: 'center',
                padding: '12px 0',
                color: '#94a3b8',
                fontSize: '0.8rem',
              }}
            >
              <span className="fa-solid fa-spinner fa-spin" /> Loading progress comments...
            </div>
          ) : filteredComments.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '16px 0',
                color: '#94a3b8',
                fontSize: '0.8rem',
              }}
            >
              No progress comments yet. Be the first to add an update on this target.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filteredComments.map(c => {
                const meta = CATEGORY_META[c.category] || CATEGORY_META.general;
                return (
                  <div
                    key={c.id}
                    style={{
                      background: '#ffffff',
                      borderRadius: 8,
                      padding: '10px 14px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: 6,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            padding: '2px 7px',
                            borderRadius: 12,
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            background: meta.bg,
                            color: meta.color,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          <span className={`fa-solid ${meta.icon}`} />
                          {meta.label}
                        </span>
                        <strong style={{ fontSize: '0.82rem', color: '#0f172a' }}>
                          {c.author_name}
                        </strong>
                        {c.author_org && (
                          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            ({c.author_org})
                          </span>
                        )}
                      </div>

                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                        {new Date(c.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.83rem', color: '#334155', lineHeight: 1.45 }}>
                      {c.content}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ProgressCommentSection;

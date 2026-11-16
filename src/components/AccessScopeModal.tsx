// ============================================================
// M01 — Access scope editor (REMA administrators)
// Sets a user's institution/district and grants or revokes scopes.
// The database enforces every rule (admin only, nobody on themselves,
// district required for District Authorities, scope fits the account);
// this dialog shows its answers.
// ============================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../services/AuthContext';
import { useInstitutions } from '../hooks/useInstitutions';
import { fetchDistricts } from '../services/dataService';
import {
  districtName,
  fetchUserScopes,
  grantScope,
  revokeScope,
  setUserAffiliation,
} from '../services/institutionService';
import { groupStakeholders } from '../utils/stakeholderGroups';
import { SCOPE_ROLE_LABELS } from '../types/index';
import type { District, ScopeRole, UserProfile, UserScope } from '../types/index';

const SCOPE_ROLE_HELP: Record<ScopeRole, string> = {
  data_entry: 'Submits reports for this institution (and district). Needs a reporting account.',
  ministry_validator:
    "Approves or rejects this institution's reports. Needs a Lead Government Ministry account.",
  institution_admin: "Approves and removes this institution's data-entry and viewer accounts.",
};

const field: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid var(--border)',
  borderRadius: 8,
  fontSize: '0.82rem',
  fontFamily: "'DM Sans', sans-serif",
  background: 'var(--surface)',
  color: 'var(--text-1)',
};
const label: React.CSSProperties = {
  display: 'block',
  fontSize: '0.7rem',
  fontWeight: 600,
  color: 'var(--text-3)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: 4,
};
const btn = (primary: boolean): React.CSSProperties => ({
  padding: '8px 14px',
  borderRadius: 8,
  fontSize: '0.8rem',
  fontWeight: 600,
  cursor: 'pointer',
  border: primary ? 'none' : '1px solid var(--border)',
  background: primary ? '#1e3a5f' : 'var(--surface)',
  color: primary ? '#fff' : 'var(--text-2)',
});

export default function AccessScopeModal({
  user,
  onClose,
  onChanged,
}: {
  /** Only the fields this dialog uses, so any profile shape fits. */
  user: Pick<UserProfile, 'id' | 'email' | 'role'> & {
    full_name?: string | null;
    institution_id?: number | null;
    district_id?: number | null;
  };
  onClose: () => void;
  onChanged: () => void;
}) {
  const { user: me } = useAuth();
  const isSelf = me?.id === user.id;
  const { institutions } = useInstitutions();
  const [districts, setDistricts] = useState<District[]>([]);
  const [scopes, setScopes] = useState<UserScope[]>([]);
  const [busy, setBusy] = useState(false);

  // Affiliation form
  const [affInstitution, setAffInstitution] = useState<number | ''>(user.institution_id ?? '');
  const [affDistrict, setAffDistrict] = useState<number | ''>(user.district_id ?? '');

  // Grant form
  const [grantRole, setGrantRole] = useState<ScopeRole>('data_entry');
  const [grantInstitution, setGrantInstitution] = useState<number | ''>(user.institution_id ?? '');
  const [grantDistrict, setGrantDistrict] = useState<number | ''>(user.district_id ?? '');

  const loadScopes = useCallback(async () => {
    try {
      setScopes(await fetchUserScopes(user.id));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, [user.id]);

  useEffect(() => {
    loadScopes();
    fetchDistricts().then(setDistricts);
  }, [loadScopes]);

  const groups = useMemo(() => groupStakeholders(institutions), [institutions]);
  const instById = useMemo(() => new Map(institutions.map(i => [i.id, i])), [institutions]);
  const grantNeedsDistrict =
    grantInstitution !== '' && !!instById.get(grantInstitution)?.covers_all_districts;
  const affNeedsDistrict =
    affInstitution !== '' && !!instById.get(affInstitution)?.covers_all_districts;

  const saveAffiliation = async () => {
    if (affNeedsDistrict && affDistrict === '') {
      toast.error('Choose the district');
      return;
    }
    setBusy(true);
    const r = await setUserAffiliation(
      user.id,
      affInstitution === '' ? null : affInstitution,
      affDistrict === '' ? null : affDistrict
    );
    setBusy(false);
    if (r.error) toast.error(r.error);
    else {
      toast.success('Institution updated');
      onChanged();
    }
  };

  const grant = async () => {
    if (grantInstitution === '') {
      toast.error('Choose the institution');
      return;
    }
    setBusy(true);
    const r = await grantScope({
      user_id: user.id,
      scope_role: grantRole,
      institution_id: grantInstitution,
      district_id: grantNeedsDistrict && grantDistrict !== '' ? grantDistrict : null,
    });
    setBusy(false);
    if (r.error) toast.error(r.error);
    else {
      toast.success(`${SCOPE_ROLE_LABELS[grantRole]} granted`);
      await loadScopes();
      onChanged();
    }
  };

  const revoke = async (s: UserScope) => {
    const what = `${SCOPE_ROLE_LABELS[s.scope_role]} for ${instById.get(s.institution_id)?.name ?? 'institution'}`;
    if (!window.confirm(`Revoke ${what}?`)) return;
    setBusy(true);
    const r = await revokeScope(s.id);
    setBusy(false);
    if (r.error) toast.error(r.error);
    else {
      toast.success('Access revoked');
      await loadScopes();
      onChanged();
    }
  };

  const institutionSelect = (value: number | '', onChange: (v: number | '') => void) => (
    <select
      value={value}
      onChange={e => onChange(e.target.value ? Number(e.target.value) : '')}
      style={field}
      disabled={isSelf || busy}
    >
      <option value="">— Institution —</option>
      {groups.map(g => (
        <optgroup key={g.label} label={g.label}>
          {g.items.map(i => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );

  const districtSelect = (value: number | '', onChange: (v: number | '') => void) => (
    <select
      value={value}
      onChange={e => onChange(e.target.value ? Number(e.target.value) : '')}
      style={field}
      disabled={isSelf || busy}
    >
      <option value="">— District —</option>
      {[...districts]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(d => (
          <option key={d.id} value={d.id}>
            {d.name}
          </option>
        ))}
    </select>
  );

  return (
    <div
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,39,68,0.6)',
        zIndex: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Access and institution"
        style={{
          background: 'var(--surface)',
          borderRadius: 14,
          width: '100%',
          maxWidth: 620,
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div
          style={{
            padding: '18px 22px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem' }}>Access and institution</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>
              {user.full_name || user.email} · {user.role.replace(/_/g, ' ')}
            </div>
          </div>
          <button onClick={onClose} style={btn(false)} aria-label="Close">
            ✕
          </button>
        </div>

        <div style={{ padding: '18px 22px' }}>
          {isSelf && (
            <div
              style={{
                padding: '10px 12px',
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: 8,
                fontSize: '0.8rem',
                marginBottom: 16,
              }}
            >
              You cannot change your own institution or access. Another administrator must do it.
            </div>
          )}

          {/* Affiliation */}
          <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 8 }}>Institution</div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr auto',
              gap: 8,
              marginBottom: 22,
            }}
          >
            {institutionSelect(affInstitution, v => {
              setAffInstitution(v);
              setAffDistrict('');
            })}
            {affNeedsDistrict ? districtSelect(affDistrict, setAffDistrict) : <div />}
            <button onClick={saveAffiliation} disabled={isSelf || busy} style={btn(true)}>
              Save
            </button>
          </div>

          {/* Current scopes */}
          <div style={{ fontWeight: 700, fontSize: '0.85rem', marginBottom: 8 }}>Access scope</div>
          {scopes.length === 0 ? (
            <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginBottom: 16 }}>
              No access granted.{' '}
              {user.role === 'local_reporting' || user.role === 'lead_government_ministry_reporting'
                ? 'This account cannot submit or review reports until it has a scope.'
                : ''}
            </div>
          ) : (
            <div style={{ marginBottom: 16 }}>
              {scopes.map(s => (
                <div
                  key={s.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 10px',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    marginBottom: 6,
                    fontSize: '0.8rem',
                  }}
                >
                  <div>
                    <strong>{SCOPE_ROLE_LABELS[s.scope_role]}</strong> ·{' '}
                    {instById.get(s.institution_id)?.name ?? `Institution ${s.institution_id}`}
                    {s.district_id ? ` · ${districtName(districts, s.district_id)}` : ''}
                  </div>
                  <button onClick={() => revoke(s)} disabled={isSelf || busy} style={btn(false)}>
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Grant */}
          <div style={{ border: '1px dashed var(--border)', borderRadius: 10, padding: 14 }}>
            <div style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: 10 }}>
              Grant access
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <span style={label}>Scope</span>
                <select
                  value={grantRole}
                  onChange={e => setGrantRole(e.target.value as ScopeRole)}
                  style={field}
                  disabled={isSelf || busy}
                >
                  {(Object.keys(SCOPE_ROLE_LABELS) as ScopeRole[]).map(r => (
                    <option key={r} value={r}>
                      {SCOPE_ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <span style={label}>Institution</span>
                {institutionSelect(grantInstitution, v => {
                  setGrantInstitution(v);
                  setGrantDistrict('');
                })}
              </div>
              {grantNeedsDistrict && (
                <div>
                  <span style={label}>District</span>
                  {districtSelect(grantDistrict, setGrantDistrict)}
                </div>
              )}
            </div>
            <div style={{ fontSize: '0.74rem', color: 'var(--text-3)', margin: '10px 0' }}>
              {SCOPE_ROLE_HELP[grantRole]}
            </div>
            <button onClick={grant} disabled={isSelf || busy} style={btn(true)}>
              Grant
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

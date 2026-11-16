// ============================================================
// M01 — My Institution (institution administrators)
// PDF section 6: "Invitations from institution admins ... a focal point
// and deputy per institution". People who signed up for this institution
// are approved here as Data entry or Viewer, and removed when they leave.
// The database decides what is allowed (approve_institution_member,
// remove_institution_member, migration 039).
// ============================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useInstitutions, useMyScopes } from '../hooks/useInstitutions';
import { fetchDistricts } from '../services/dataService';
import {
  approveMember,
  districtName,
  fetchInstitutionMembers,
  removeMember,
} from '../services/institutionService';
import type { District, UserProfile } from '../types/index';

const card: React.CSSProperties = {
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  boxShadow: 'var(--shadow-sm)',
  padding: 18,
  marginBottom: 16,
};
const btn = (kind: 'primary' | 'plain' | 'danger'): React.CSSProperties => ({
  padding: '6px 12px',
  borderRadius: 7,
  fontSize: '0.76rem',
  fontWeight: 600,
  cursor: 'pointer',
  border: kind === 'plain' ? '1px solid var(--border)' : 'none',
  background: kind === 'primary' ? '#1e3a5f' : kind === 'danger' ? '#fee2e2' : 'var(--surface)',
  color: kind === 'primary' ? '#fff' : kind === 'danger' ? '#991b1b' : 'var(--text-2)',
});

const MEMBER_ROLE_LABEL: Record<string, string> = {
  local_reporting: 'Data entry',
  policy_monitoring: 'Viewer',
  public_viewer: 'No access',
  lead_government_ministry_reporting: 'Ministry account (managed by REMA)',
  dashboard_management: 'REMA administrator',
  programme_alignment: 'Development partner (managed by REMA)',
};

export default function MyInstitutionPage() {
  const { scopes, loading: loadingScopes, isInstitutionAdmin } = useMyScopes();
  const { institutions } = useInstitutions();
  const [districts, setDistricts] = useState<District[]>([]);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [districtChoice, setDistrictChoice] = useState<Record<string, number>>({});

  const adminScopes = useMemo(
    () => scopes.filter(s => s.scope_role === 'institution_admin'),
    [scopes]
  );
  const instById = useMemo(() => new Map(institutions.map(i => [i.id, i])), [institutions]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const all = await fetchInstitutionMembers();
      // Only people in the institutions (and districts) this user administers.
      setMembers(
        all.filter(m =>
          adminScopes.some(
            s =>
              s.institution_id === m.institution_id &&
              (s.district_id === null || s.district_id === m.district_id)
          )
        )
      );
    } catch (e) {
      toast.error((e as Error).message);
    }
    setLoading(false);
  }, [adminScopes]);

  useEffect(() => {
    if (!loadingScopes) load();
  }, [loadingScopes, load]);

  useEffect(() => {
    fetchDistricts().then(setDistricts);
  }, []);

  const approve = async (m: UserProfile, as: 'data_entry' | 'viewer') => {
    const inst = m.institution_id ? instById.get(m.institution_id) : undefined;
    const district = districtChoice[m.id] ?? m.district_id ?? null;
    if (as === 'data_entry' && inst?.covers_all_districts && !district) {
      toast.error('Choose the district this person reports for');
      return;
    }
    setBusy(m.id);
    const r = await approveMember(m.id, as, district);
    setBusy(null);
    if (r.error) toast.error(r.error);
    else {
      toast.success(
        `${m.full_name || m.email} approved as ${as === 'data_entry' ? 'Data entry' : 'Viewer'}`
      );
      load();
    }
  };

  const remove = async (m: UserProfile) => {
    if (!window.confirm(`Remove ${m.full_name || m.email}? Their account will be deactivated.`))
      return;
    setBusy(m.id);
    const r = await removeMember(m.id);
    setBusy(null);
    if (r.error) toast.error(r.error);
    else {
      toast.success('Member removed');
      load();
    }
  };

  if (loadingScopes) {
    return <div style={card}>Loading…</div>;
  }
  if (!isInstitutionAdmin) {
    return (
      <div style={card}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>My Institution</div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-2)' }}>
          You are not an institution administrator. REMA assigns this role to each institution's
          focal point and deputy.
        </div>
      </div>
    );
  }

  const pending = members.filter(m => !m.is_active);
  const active = members.filter(m => m.is_active);
  const managed = (m: UserProfile) =>
    ['local_reporting', 'policy_monitoring', 'public_viewer'].includes(m.role);

  const scopeLabel = adminScopes
    .map(
      s =>
        `${instById.get(s.institution_id)?.name ?? 'Institution'}${
          s.district_id ? ` · ${districtName(districts, s.district_id)}` : ''
        }`
    )
    .join(', ');

  const row = (m: UserProfile, isPending: boolean) => {
    const inst = m.institution_id ? instById.get(m.institution_id) : undefined;
    const needsDistrict = !!inst?.covers_all_districts;
    const fixedDistrict = adminScopes.find(
      s => s.institution_id === m.institution_id && s.district_id !== null
    )?.district_id;
    return (
      <tr key={m.id} style={{ borderTop: '1px solid var(--border)' }}>
        <td style={{ padding: '10px 8px' }}>
          <div style={{ fontWeight: 600, fontSize: '0.84rem' }}>{m.full_name || '—'}</div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-3)' }}>{m.email}</div>
        </td>
        <td style={{ padding: '10px 8px', fontSize: '0.8rem' }}>
          {isPending ? 'Waiting for approval' : (MEMBER_ROLE_LABEL[m.role] ?? m.role)}
        </td>
        <td style={{ padding: '10px 8px', fontSize: '0.8rem' }}>
          {needsDistrict && !fixedDistrict ? (
            <select
              value={districtChoice[m.id] ?? m.district_id ?? ''}
              onChange={e => setDistrictChoice(c => ({ ...c, [m.id]: Number(e.target.value) }))}
              style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)' }}
              aria-label={`District for ${m.email}`}
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
          ) : (
            districtName(districts, fixedDistrict ?? m.district_id ?? null) || '—'
          )}
        </td>
        <td style={{ padding: '10px 8px', textAlign: 'right', whiteSpace: 'nowrap' }}>
          {managed(m) ? (
            <div style={{ display: 'inline-flex', gap: 6 }}>
              {m.role !== 'local_reporting' || isPending ? (
                <button
                  disabled={busy === m.id}
                  style={btn('primary')}
                  onClick={() => approve(m, 'data_entry')}
                >
                  {isPending ? 'Approve as data entry' : 'Make data entry'}
                </button>
              ) : null}
              {m.role !== 'policy_monitoring' || isPending ? (
                <button
                  disabled={busy === m.id}
                  style={btn('plain')}
                  onClick={() => approve(m, 'viewer')}
                >
                  {isPending ? 'Approve as viewer' : 'Make viewer'}
                </button>
              ) : null}
              {!isPending && (
                <button disabled={busy === m.id} style={btn('danger')} onClick={() => remove(m)}>
                  Remove
                </button>
              )}
            </div>
          ) : (
            <span style={{ fontSize: '0.74rem', color: 'var(--text-3)' }}>Managed by REMA</span>
          )}
        </td>
      </tr>
    );
  };

  const table = (rows: UserProfile[], isPending: boolean, empty: string) =>
    rows.length === 0 ? (
      <div style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>{empty}</div>
    ) : (
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ fontSize: '0.7rem', color: 'var(--text-3)', textAlign: 'left' }}>
            <th style={{ padding: '6px 8px' }}>Person</th>
            <th style={{ padding: '6px 8px' }}>Access</th>
            <th style={{ padding: '6px 8px' }}>District</th>
            <th />
          </tr>
        </thead>
        <tbody>{rows.map(m => row(m, isPending))}</tbody>
      </table>
    );

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>My Institution</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>
          You administer: {scopeLabel}. Approve people who asked to join, and remove those who
          leave. Validators and administrators are managed by REMA.
        </div>
      </div>

      <div style={card}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>
          Waiting for approval {pending.length > 0 && `(${pending.length})`}
        </div>
        {loading ? 'Loading…' : table(pending, true, 'Nobody is waiting for approval.')}
      </div>

      <div style={card}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Members ({active.length})</div>
        {loading ? 'Loading…' : table(active, false, 'No active members yet.')}
      </div>
    </div>
  );
}

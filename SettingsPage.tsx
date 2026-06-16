import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { saveUserSettings, saveNotifPreferences, fetchNotifPreferences, fetchAuditLog, exportAuditLogToCSV } from './dataService';
import { updateProfile, updatePassword, getAllUsers, updateUserRole } from './authService';
import { useAuditLog } from './useData';
import type { UserSettings, NotificationPreferences, UserRole } from './index';
import { USER_ROLE_LABELS } from './index';
import toast from 'react-hot-toast';

const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
  <label style={{ position: 'relative', width: 40, height: 22, flexShrink: 0, cursor: 'pointer' }}>
    <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
    <span
      style={{
        position: 'absolute', inset: 0, borderRadius: 11,
        background: checked ? '#10b981' : '#e2e8f0',
        transition: '0.2s', border: checked ? '1px solid #059669' : '1px solid #e2e8f0',
      }}
    >
      <span style={{ position: 'absolute', top: 2, left: checked ? 20 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: '0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </span>
  </label>
);

const TabBar = ({ tabs, active, onSelect }: { tabs: string[]; active: string; onSelect: (t: string) => void }) => (
  <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid #e2e8f0', marginBottom: 0 }}>
    {tabs.map(tab => (
      <button key={tab} onClick={() => onSelect(tab)} style={{ padding: '9px 16px', border: 'none', borderBottom: tab === active ? '2px solid #0ea5e9' : '2px solid transparent', marginBottom: -1, background: 'none', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', color: tab === active ? '#0ea5e9' : '#94a3b8', fontFamily: "'DM Sans', sans-serif", transition: '0.2s' }}>
        {tab}
      </button>
    ))}
  </div>
);

export default function SettingsPage() {
  const { user, permissions, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('General');

  // Settings state
  const [settings, setSettings] = useState<Partial<UserSettings>>({
    show_live_stats: true, animate_bars: true, compact_sidebar: false,
    auto_refresh: true, show_baseline: true, require_verification: true,
    species_fuzzing: false, mask_species_names: false, restrict_raw_export: true,
    log_exports: true, language: 'en',
  });
  const [notifPrefs, setNotifPrefs] = useState<Partial<NotificationPreferences>>({
    sub_overdue: true, sub_compliance: true, compliance_threshold: 60,
    sub_deadlines: true, deadline_days: 14, sub_pending: true,
    sub_finance: true, sub_risk: true,
  });
  const [profileForm, setProfileForm] = useState({ full_name: user?.full_name || '', organization: user?.organization || '' });
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [auditFilter, setAuditFilter] = useState('all');
  const [saving, setSaving] = useState(false);

  const { data: auditEntries } = useAuditLog({ actionType: auditFilter === 'all' ? undefined : auditFilter });

  useEffect(() => {
    if (!user?.id) return;
    fetchNotifPreferences(user.id).then(p => { if (p) setNotifPrefs(p); });
  }, [user?.id]);

  const handleSaveGeneral = useCallback(async () => {
    if (!user?.id) return;
    setSaving(true);
    const r = await saveUserSettings(user.id, settings);
    if (r.error) toast.error(r.error);
    else toast.success('Settings saved');
    setSaving(false);
  }, [user?.id, settings]);

  const handleSaveNotif = useCallback(async () => {
    if (!user?.id) return;
    setSaving(true);
    const r = await saveNotifPreferences(user.id, notifPrefs);
    if (r.error) toast.error(r.error);
    else toast.success('Notification preferences saved');
    setSaving(false);
  }, [user?.id, notifPrefs]);

  const handleSaveProfile = useCallback(async () => {
    if (!user?.id) return;
    setSaving(true);
    const r = await updateProfile(user.id, profileForm);
    if (r.error) toast.error(r.error);
    else { toast.success('Profile updated'); refreshProfile(); }
    setSaving(false);
  }, [user?.id, profileForm, refreshProfile]);

  const handleChangePassword = useCallback(async () => {
    if (pwForm.next !== pwForm.confirm) { toast.error('Passwords do not match'); return; }
    if (pwForm.next.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setSaving(true);
    const r = await updatePassword(pwForm.next);
    if (r.error) toast.error(r.error);
    else { toast.success('Password updated'); setPwForm({ current: '', next: '', confirm: '' }); }
    setSaving(false);
  }, [pwForm]);

  const handleExportAudit = useCallback(async () => {
    if (!auditEntries?.length) return;
    const csv = await exportAuditLogToCSV(auditEntries);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `nbsap_audit_log_${Date.now()}.csv`;
    a.click();
    toast.success('Audit log exported');
  }, [auditEntries]);

  const settingRow = (label: string, sub: string, key: keyof UserSettings) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f8fafc' }}>
      <div>
        <div style={{ fontSize: '0.83rem', fontWeight: 500, color: '#0f172a' }}>{label}</div>
        <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 2 }}>{sub}</div>
      </div>
      <Toggle checked={!!settings[key]} onChange={v => setSettings(s => ({ ...s, [key]: v }))} />
    </div>
  );

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>⚙ Dashboard Settings</h2>
        </div>

        {/* Tabs */}
        <div style={{ padding: '0 24px' }}>
          <TabBar
            tabs={['General', 'Profile', 'Notifications', 'Security', ...(permissions?.canViewAuditLog ? ['Audit Log'] : [])]}
            active={activeTab}
            onSelect={setActiveTab}
          />
        </div>

        <div style={{ padding: '20px 24px' }}>
          {/* GENERAL */}
          {activeTab === 'General' && (
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8', fontFamily: "'DM Mono', monospace", marginBottom: 12 }}>
                Display
              </div>
              {settingRow('Show Live Toolkit Stats', 'Display real-time T01–T07 counts on dashboard', 'show_live_stats')}
              {settingRow('Animate Progress Bars', 'Animate bars on tab load', 'animate_bars')}
              {settingRow('Compact Sidebar', 'Icons only — hides label text', 'compact_sidebar')}
              <div style={{ marginTop: 16, marginBottom: 12, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8', fontFamily: "'DM Mono', monospace" }}>
                Data & Reporting
              </div>
              {settingRow('Auto-refresh Dashboard', 'Refresh metrics every 60 seconds', 'auto_refresh')}
              {settingRow('Show Baseline on Charts', 'Include 2025 baseline in trend charts', 'show_baseline')}
              {settingRow('Require Verification Before Dashboard Update', 'New submissions stay pending until approved', 'require_verification')}
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8', fontFamily: "'DM Mono', monospace", marginBottom: 10 }}>
                  Language
                </div>
                <select
                  value={settings.language || 'en'}
                  onChange={e => setSettings(s => ({ ...s, language: e.target.value }))}
                  style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.82rem', fontFamily: "'DM Sans', sans-serif", outline: 'none', background: '#f8fafc' }}
                >
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                  <option value="rw">Kinyarwanda</option>
                </select>
              </div>
              <button onClick={handleSaveGeneral} disabled={saving} style={{ marginTop: 20, padding: '9px 22px', background: '#0f2744', color: '#fff', border: 'none', borderRadius: 9, fontSize: '0.83rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                {saving ? 'Saving…' : 'Save Settings'}
              </button>
            </div>
          )}

          {/* PROFILE */}
          {activeTab === 'Profile' && (
            <div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94a3b8', display: 'block', marginBottom: 5 }}>Full Name</label>
                <input type="text" value={profileForm.full_name} onChange={e => setProfileForm(f => ({ ...f, full_name: e.target.value }))} style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.83rem', fontFamily: "'DM Sans', sans-serif", outline: 'none' }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94a3b8', display: 'block', marginBottom: 5 }}>Organization</label>
                <input type="text" value={profileForm.organization} onChange={e => setProfileForm(f => ({ ...f, organization: e.target.value }))} style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.83rem', fontFamily: "'DM Sans', sans-serif", outline: 'none' }} />
              </div>
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 14px', marginBottom: 14 }}>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginBottom: 4 }}>Email (cannot be changed here)</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{user?.email}</div>
              </div>
              <div style={{ background: '#eff6ff', borderRadius: 8, padding: '12px 14px', marginBottom: 14, borderLeft: '3px solid #0ea5e9' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#0369a1', fontFamily: "'DM Mono', monospace", marginBottom: 4 }}>ACCESS ROLE</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0369a1' }}>{user?.role ? USER_ROLE_LABELS[user.role] : '—'}</div>
                <div style={{ fontSize: '0.72rem', color: '#0369a1', marginTop: 4, opacity: 0.8 }}>Contact REMA admin to change your role</div>
              </div>
              <button onClick={handleSaveProfile} disabled={saving} style={{ padding: '9px 22px', background: '#0f2744', color: '#fff', border: 'none', borderRadius: 9, fontSize: '0.83rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", marginRight: 10 }}>
                {saving ? 'Saving…' : 'Update Profile'}
              </button>
              <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#94a3b8', fontFamily: "'DM Mono', monospace", marginBottom: 12 }}>Change Password</div>
                {['next', 'confirm'].map(field => (
                  <div key={field} style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94a3b8', display: 'block', marginBottom: 5 }}>
                      {field === 'next' ? 'New Password' : 'Confirm New Password'}
                    </label>
                    <input type="password" value={(pwForm as Record<string,string>)[field]} onChange={e => setPwForm(f => ({ ...f, [field]: e.target.value }))} style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.83rem', fontFamily: "'DM Sans', sans-serif", outline: 'none' }} />
                  </div>
                ))}
                <button onClick={handleChangePassword} disabled={saving} style={{ padding: '9px 22px', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 9, fontSize: '0.83rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                  Update Password
                </button>
              </div>
            </div>
          )}

          {/* NOTIFICATIONS */}
          {activeTab === 'Notifications' && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#94a3b8', display: 'block', marginBottom: 5 }}>Email for Alerts</label>
                <input type="email" placeholder="your@rema.gov.rw" value={notifPrefs.email || ''} onChange={e => setNotifPrefs(p => ({ ...p, email: e.target.value }))} style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.83rem', fontFamily: "'DM Sans', sans-serif", outline: 'none' }} />
              </div>
              {[
                { key: 'sub_overdue', label: 'Overdue District Reports', desc: 'Alert when districts have not submitted within the reporting window' },
                { key: 'sub_compliance', label: 'Compliance Below Threshold', desc: 'Alert when indicator drops below threshold' },
                { key: 'sub_deadlines', label: 'Upcoming Report Deadlines', desc: 'Alert before a reporting deadline' },
                { key: 'sub_pending', label: 'New Submissions Pending Verification', desc: 'Notify when toolkit submissions await REMA review' },
                { key: 'sub_finance', label: 'Finance Disbursement Gap', desc: 'Alert when disbursement falls below allocation by 30%' },
                { key: 'sub_risk', label: 'High-Risk Trigger', desc: 'Alert when a High-level risk is triggered' },
              ].map(({ key, label, desc }) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f8fafc' }}>
                  <div>
                    <div style={{ fontSize: '0.83rem', fontWeight: 500, color: '#0f172a' }}>{label}</div>
                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 2 }}>{desc}</div>
                  </div>
                  <Toggle checked={!!notifPrefs[key as keyof NotificationPreferences]} onChange={v => setNotifPrefs(p => ({ ...p, [key]: v }))} />
                </div>
              ))}
              <button onClick={handleSaveNotif} disabled={saving} style={{ marginTop: 16, padding: '9px 22px', background: '#0f2744', color: '#fff', border: 'none', borderRadius: 9, fontSize: '0.83rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                {saving ? 'Saving…' : 'Save Preferences'}
              </button>
            </div>
          )}

          {/* SECURITY */}
          {activeTab === 'Security' && (
            <div>
              {settingRow('Enable Species Location Fuzzing', 'Blur GPS coordinates of sensitive species to ~5 km radius', 'species_fuzzing')}
              {settingRow('Mask Sensitive Species Names in Public View', 'Replace threatened species names with generic taxonomy in public exports', 'mask_species_names')}
              {settingRow('Restrict Raw Data Export by Role', 'Public users can only export aggregated summaries', 'restrict_raw_export')}
              {settingRow('Log All Data Exports', 'Record every export in the Audit Log', 'log_exports')}
              <div style={{ marginTop: 16, background: '#f8fafc', borderRadius: 9, padding: '14px', fontSize: '0.78rem', color: '#475569', lineHeight: 1.8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 14px' }}>
                  <span style={{ fontWeight: 700, color: '#166534' }}>🌐 Public</span><span>Headline indicators, national summaries, aggregated maps.</span>
                  <span style={{ fontWeight: 700, color: '#1e40af' }}>🏛 Institutional</span><span>Own data entry. No approval rights. No raw export.</span>
                  <span style={{ fontWeight: 700, color: '#6b21a8' }}>📊 Decision-Maker</span><span>Full dashboard, verification queue, all exports, audit log.</span>
                </div>
              </div>
              <button onClick={handleSaveGeneral} disabled={saving} style={{ marginTop: 16, padding: '9px 22px', background: '#0f2744', color: '#fff', border: 'none', borderRadius: 9, fontSize: '0.83rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                {saving ? 'Saving…' : 'Save Security Settings'}
              </button>
            </div>
          )}

          {/* AUDIT LOG */}
          {activeTab === 'Audit Log' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Activity Audit Log</div>
                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 2 }}>Tracks data access, exports, submissions, approvals and role changes.</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select value={auditFilter} onChange={e => setAuditFilter(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: '0.78rem', fontFamily: "'DM Sans', sans-serif", outline: 'none' }}>
                    {['all', 'submit', 'approve', 'reject', 'export', 'view', 'login', 'delete'].map(v => (
                      <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
                    ))}
                  </select>
                  <button onClick={handleExportAudit} style={{ padding: '6px 14px', border: '1.5px solid #0ea5e9', borderRadius: 7, color: '#0ea5e9', background: 'transparent', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                    Export CSV
                  </button>
                </div>
              </div>
              <div style={{ maxHeight: 340, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: 9, padding: '4px 12px' }}>
                {!auditEntries?.length ? (
                  <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>No audit events recorded yet.</div>
                ) : auditEntries.map(e => (
                  <div key={e.id} style={{ display: 'flex', gap: 10, padding: '9px 0', borderBottom: '1px solid #f8fafc', fontSize: '0.78rem', alignItems: 'flex-start' }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", color: '#94a3b8', fontSize: '0.68rem', paddingTop: 2, minWidth: 130, whiteSpace: 'nowrap' }}>
                      {new Date(e.created_at).toLocaleString()}
                    </span>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 600, color: '#0f172a' }}>{e.action}</span>
                      {e.detail && <div style={{ color: '#64748b', fontSize: '0.72rem', marginTop: 1 }}>{e.detail}</div>}
                    </div>
                    <span style={{ fontSize: '0.6rem', padding: '2px 7px', borderRadius: 8, fontWeight: 700, fontFamily: "'DM Mono', monospace", background: '#dbeafe', color: '#1e40af', whiteSpace: 'nowrap' }}>
                      {e.action_type?.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10, fontSize: '0.68rem', color: '#94a3b8', fontFamily: "'DM Mono', monospace" }}>
                {auditEntries?.length ?? 0} events recorded
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

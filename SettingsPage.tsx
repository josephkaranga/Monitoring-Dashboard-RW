import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { saveUserSettings, saveNotifPreferences, fetchNotifPreferences, exportAuditLogToCSV } from './dataService';
import { updateProfile, updatePassword } from './authService';
import { useAuditLog } from './useData';
import type { UserSettings, NotificationPreferences } from './index';
import { USER_ROLE_LABELS } from './index';
import toast from 'react-hot-toast';

// ── Toggle ────────────────────────────────────────────────────
const Toggle = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
  <label style={{ position: 'relative', width: 40, height: 22, flexShrink: 0, cursor: 'pointer', display: 'inline-block' }}>
    <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
    <span style={{ position: 'absolute', inset: 0, borderRadius: 11, background: checked ? '#10b981' : 'var(--surface-3)', transition: '0.2s', border: checked ? '1px solid #059669' : '1px solid var(--border)' }}>
      <span style={{ position: 'absolute', top: 2, left: checked ? 20 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: '0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
    </span>
  </label>
);

// ── Setting row ───────────────────────────────────────────────
const SettingRow = ({ label, sub, children }: { label: string; sub: string; children: React.ReactNode }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--surface-3)' }}>
    <div>
      <div style={{ fontSize: '0.83rem', fontWeight: 500, color: 'var(--text-1)' }}>{label}</div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 2 }}>{sub}</div>
    </div>
    {children}
  </div>
);

// ── Section header ────────────────────────────────────────────
const SectionHead = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-3)', fontFamily: "'DM Mono', monospace", marginBottom: 12, marginTop: 20 }}>
    {children}
  </div>
);

export default function SettingsPage() {
  const { user, permissions, refreshProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('General');

  const [settings, setSettings] = useState<Partial<UserSettings>>({
    show_live_stats: true, animate_bars: true, compact_sidebar: false,
    auto_refresh: true, show_baseline: true, require_verification: true,
    species_fuzzing: false, mask_species_names: false,
    restrict_raw_export: true, log_exports: true, language: 'en',
  });
  const [notifPrefs, setNotifPrefs] = useState<Partial<NotificationPreferences>>({
    sub_overdue: true, sub_compliance: true, compliance_threshold: 60,
    sub_deadlines: true, deadline_days: 14, sub_pending: true,
    sub_finance: true, sub_risk: true,
  });
  const [profileForm, setProfileForm] = useState({ full_name: user?.full_name || '', organization: user?.organization || '' });
  const [pwForm, setPwForm] = useState({ next: '', confirm: '' });
  const [auditFilter, setAuditFilter] = useState('all');
  const [saving, setSaving] = useState(false);

  const { data: rawAuditEntries } = useAuditLog({ actionType: auditFilter === 'all' ? undefined : auditFilter });
  const auditEntries = rawAuditEntries ?? [];

  useEffect(() => {
    if (!user?.id) return;
    fetchNotifPreferences(user.id).then(p => { if (p) setNotifPrefs(p); });
  }, [user?.id]);

  const handleSaveGeneral = useCallback(async () => {
    if (!user?.id) return;
    setSaving(true);
    const r = await saveUserSettings(user.id, settings);
    if (r.error) toast.error(r.error); else toast.success('Settings saved');
    setSaving(false);
  }, [user?.id, settings]);

  const handleSaveNotif = useCallback(async () => {
    if (!user?.id) return;
    setSaving(true);
    const r = await saveNotifPreferences(user.id, notifPrefs);
    if (r.error) toast.error(r.error); else toast.success('Notification preferences saved');
    setSaving(false);
  }, [user?.id, notifPrefs]);

  const handleSaveProfile = useCallback(async () => {
    if (!user?.id) return;
    setSaving(true);
    const r = await updateProfile(user.id, profileForm);
    if (r.error) toast.error(r.error); else { toast.success('Profile updated'); refreshProfile(); }
    setSaving(false);
  }, [user?.id, profileForm, refreshProfile]);

  const handleChangePassword = useCallback(async () => {
    if (pwForm.next !== pwForm.confirm) { toast.error('Passwords do not match'); return; }
    if (pwForm.next.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setSaving(true);
    const r = await updatePassword(pwForm.next);
    if (r.error) toast.error(r.error); else { toast.success('Password updated'); setPwForm({ next: '', confirm: '' }); }
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

  const tabs = ['General', 'Profile', 'Notifications', 'Security', ...(permissions?.canViewAuditLog ? ['Audit Log'] : [])];

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', border: '1.5px solid var(--border)',
    borderRadius: 8, fontSize: '0.83rem', fontFamily: "'DM Sans', sans-serif", outline: 'none',
    background: 'var(--surface)', color: 'var(--text-1)',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.06em',
    textTransform: 'uppercase', color: 'var(--text-3)', display: 'block', marginBottom: 5,
  };

  const saveBtn = (label: string, onClick: () => void) => (
    <button onClick={onClick} disabled={saving}
      style={{ marginTop: 20, padding: '9px 22px', background: 'var(--navy)', color: '#fff', border: 'none', borderRadius: 9, fontSize: '0.83rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", opacity: saving ? 0.7 : 1 }}>
      {saving ? 'Saving…' : label}
    </button>
  );

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <div style={{ background: 'var(--surface)', borderRadius: 18, border: '1px solid var(--border)', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 10 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fa-solid fa-gear" style={{ color: 'var(--sky-dim)' }} />
            Dashboard Settings
          </h3>
        </div>

        {/* Sub-tabs */}
        <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--border)', padding: '0 24px' }}>
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ padding: '9px 16px', border: 'none', borderBottom: tab === activeTab ? '2px solid var(--sky-dim)' : '2px solid transparent', marginBottom: -1, background: 'none', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', color: tab === activeTab ? 'var(--sky-dim)' : 'var(--text-3)', fontFamily: "'DM Sans', sans-serif", transition: '0.2s' }}>
              {tab}
            </button>
          ))}
        </div>

        <div style={{ padding: '20px 24px' }}>

          {/* ── GENERAL ── */}
          {activeTab === 'General' && (
            <div>
              <SectionHead>Display</SectionHead>
              <SettingRow label="Show Live Toolkit Stats" sub="Display real-time T01–T07 submission counts on dashboard">
                <Toggle checked={!!settings.show_live_stats} onChange={v => setSettings(s => ({ ...s, show_live_stats: v }))} />
              </SettingRow>
              <SettingRow label="Animate Progress Bars" sub="Animate bars on tab load">
                <Toggle checked={!!settings.animate_bars} onChange={v => setSettings(s => ({ ...s, animate_bars: v }))} />
              </SettingRow>
              <SettingRow label="Compact Sidebar" sub="Hide label text, show icons only">
                <Toggle checked={!!settings.compact_sidebar} onChange={v => setSettings(s => ({ ...s, compact_sidebar: v }))} />
              </SettingRow>

              <SectionHead>Data &amp; Reporting</SectionHead>
              <SettingRow label="Auto-refresh Dashboard" sub="Refresh metrics every 60 seconds">
                <Toggle checked={!!settings.auto_refresh} onChange={v => setSettings(s => ({ ...s, auto_refresh: v }))} />
              </SettingRow>
              <SettingRow label="Show Baseline Data on Charts" sub="Include 2025 baseline in trend charts">
                <Toggle checked={!!settings.show_baseline} onChange={v => setSettings(s => ({ ...s, show_baseline: v }))} />
              </SettingRow>
              <SettingRow label="Require Verification Before Dashboard Update" sub="New toolkit submissions stay pending until approved by REMA reviewer">
                <Toggle checked={!!settings.require_verification} onChange={v => setSettings(s => ({ ...s, require_verification: v }))} />
              </SettingRow>

              <SectionHead>Language</SectionHead>
              <select value={settings.language || 'en'} onChange={e => setSettings(s => ({ ...s, language: e.target.value }))}
                style={{ padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.82rem', fontFamily: "'DM Sans', sans-serif", outline: 'none', background: 'var(--surface-2)' }}>
                <option value="en">English</option>
                <option value="fr">Français</option>
                <option value="rw">Kinyarwanda</option>
              </select>

              <SectionHead>Data Management</SectionHead>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button style={{ padding: '8px 16px', border: '1.5px solid #8b5cf6', borderRadius: 8, color: '#8b5cf6', background: 'transparent', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="fa-solid fa-file-code" /> Backup All Data
                </button>
                <button style={{ padding: '8px 16px', border: '1.5px solid #10b981', borderRadius: 8, color: '#10b981', background: 'transparent', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 6 }}>
                  <i className="fa-solid fa-file-import" /> Restore from Backup
                </button>
              </div>

              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)', fontSize: '0.72rem', color: 'var(--text-3)', fontFamily: "'DM Mono', monospace" }}>
                NBSAP Monitoring System · Rwanda · v6.0
              </div>
              {saveBtn('Save Settings', handleSaveGeneral)}
            </div>
          )}

          {/* ── PROFILE ── */}
          {activeTab === 'Profile' && (
            <div>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Full Name</label>
                <input type="text" value={profileForm.full_name} onChange={e => setProfileForm(f => ({ ...f, full_name: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Organization</label>
                <input type="text" value={profileForm.organization} onChange={e => setProfileForm(f => ({ ...f, organization: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ background: 'var(--surface-2)', borderRadius: 8, padding: '12px 14px', marginBottom: 14 }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: 4 }}>Email (cannot be changed here)</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{user?.email}</div>
              </div>
              <div style={{ background: '#eff6ff', borderRadius: 8, padding: '12px 14px', marginBottom: 14, borderLeft: '3px solid var(--sky-dim)' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#0369a1', fontFamily: "'DM Mono', monospace", marginBottom: 4 }}>ACCESS ROLE</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0369a1' }}>{user?.role ? USER_ROLE_LABELS[user.role] : '—'}</div>
                <div style={{ fontSize: '0.72rem', color: '#0369a1', marginTop: 4, opacity: 0.8 }}>Contact REMA admin to change your role</div>
              </div>
              {saveBtn('Update Profile', handleSaveProfile)}

              <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
                <SectionHead>Change Password</SectionHead>
                {[['next','New Password'],['confirm','Confirm New Password']].map(([field, lbl]) => (
                  <div key={field} style={{ marginBottom: 10 }}>
                    <label style={labelStyle}>{lbl}</label>
                    <input type="password" value={(pwForm as Record<string,string>)[field]} onChange={e => setPwForm(f => ({ ...f, [field]: e.target.value }))} style={inputStyle} />
                  </div>
                ))}
                <button onClick={handleChangePassword} disabled={saving}
                  style={{ padding: '9px 22px', background: '#1e3a5f', color: '#fff', border: 'none', borderRadius: 9, fontSize: '0.83rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                  Update Password
                </button>
              </div>
            </div>
          )}

          {/* ── NOTIFICATIONS ── */}
          {activeTab === 'Notifications' && (
            <div>
              <SectionHead>Contact Details</SectionHead>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Email Address <span style={{ color: 'var(--text-3)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(for deadline &amp; compliance alerts)</span></label>
                <input type="email" placeholder="your.name@rema.gov.rw" value={notifPrefs.email || ''} onChange={e => setNotifPrefs(p => ({ ...p, email: e.target.value }))} style={inputStyle} />
              </div>

              <SectionHead>Alert Subscriptions</SectionHead>
              {[
                { key: 'sub_overdue',   label: 'Overdue District Reports',              desc: 'Alert when districts have not submitted within the reporting window' },
                { key: 'sub_compliance',label: 'Compliance Below Threshold',            desc: 'Alert when an indicator drops below the warning level' },
                { key: 'sub_deadlines', label: 'Upcoming Report Deadlines',             desc: 'Alert N days before a reporting deadline' },
                { key: 'sub_pending',   label: 'New Submissions Pending Verification',  desc: 'Notify when toolkit submissions are awaiting REMA review' },
                { key: 'sub_finance',   label: 'Finance Disbursement Gap',              desc: 'Alert when disbursement falls below allocation by more than 30%' },
                { key: 'sub_risk',      label: 'High-Risk Trigger Activated',           desc: 'Alert when a High-level risk in the Risk Register is triggered' },
              ].map(({ key, label, desc }) => (
                <SettingRow key={key} label={label} sub={desc}>
                  <Toggle checked={!!notifPrefs[key as keyof NotificationPreferences]} onChange={v => setNotifPrefs(p => ({ ...p, [key]: v }))} />
                </SettingRow>
              ))}
              {saveBtn('Save Preferences', handleSaveNotif)}
            </div>
          )}

          {/* ── SECURITY ── */}
          {activeTab === 'Security' && (
            <div>
              <SectionHead>Species Location Privacy</SectionHead>
              <SettingRow label="Enable Species Location Fuzzing" sub="Blur exact GPS coordinates of sensitive species observations to ~5 km radius before display or export. Applies to T03 Protected Area data.">
                <Toggle checked={!!settings.species_fuzzing} onChange={v => setSettings(s => ({ ...s, species_fuzzing: v }))} />
              </SettingRow>
              <SettingRow label="Mask Sensitive Species Names in Public View" sub="Replace threatened species names with generic taxonomy in public-access exports">
                <Toggle checked={!!settings.mask_species_names} onChange={v => setSettings(s => ({ ...s, mask_species_names: v }))} />
              </SettingRow>

              <SectionHead>Export Controls</SectionHead>
              <SettingRow label="Restrict Raw Data Export by Role" sub="Public users can only export aggregated summaries. Raw records require Institutional or Decision-Maker role.">
                <Toggle checked={!!settings.restrict_raw_export} onChange={v => setSettings(s => ({ ...s, restrict_raw_export: v }))} />
              </SettingRow>
              <SettingRow label="Log All Data Exports" sub="Record every export action in the Audit Log with user role and timestamp">
                <Toggle checked={!!settings.log_exports} onChange={v => setSettings(s => ({ ...s, log_exports: v }))} />
              </SettingRow>

              <SectionHead>Access Control Summary</SectionHead>
              <div style={{ background: 'var(--surface-2)', borderRadius: 9, padding: 14, fontSize: '0.78rem', color: 'var(--text-2)', lineHeight: 1.8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 14px' }}>
                  <span style={{ fontWeight: 700, color: '#166534' }}>🌐 Public</span>
                  <span>Headline indicators, national summaries, aggregated maps. No data entry. No raw export.</span>
                  <span style={{ fontWeight: 700, color: '#1e40af' }}>🏛 Institutional</span>
                  <span>Own ministry/district data entry and submission. Can view own submissions. No approval rights.</span>
                  <span style={{ fontWeight: 700, color: '#6b21a8' }}>📊 Decision-Maker</span>
                  <span>Full dashboard, verification queue, all exports, AI narratives, risk register, audit log.</span>
                </div>
              </div>
              {saveBtn('Save Security Settings', handleSaveGeneral)}
            </div>
          )}

          {/* ── AUDIT LOG ── */}
          {activeTab === 'Audit Log' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>Activity Audit Log</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: 2 }}>Tracks data access, exports, submissions, approvals and role changes. Stored in session.</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <select value={auditFilter} onChange={e => setAuditFilter(e.target.value)}
                    style={{ padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 7, fontSize: '0.78rem', fontFamily: "'DM Sans', sans-serif", outline: 'none' }}>
                    {['all','submit','approve','reject','export','view','login','delete'].map(v => (
                      <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
                    ))}
                  </select>
                  <button onClick={handleExportAudit}
                    style={{ padding: '6px 14px', border: '1.5px solid var(--sky-dim)', borderRadius: 7, color: 'var(--sky-dim)', background: 'transparent', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 5 }}>
                    <i className="fa-solid fa-download" /> Export
                  </button>
                </div>
              </div>

              <div style={{ maxHeight: 340, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 9, padding: '4px 12px' }}>
              {auditEntries.length === 0 ? (
                  <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)', fontSize: '0.82rem' }}>
                    <i className="fa-solid fa-shield-check" style={{ fontSize: '1.5rem', display: 'block', marginBottom: 8, opacity: 0.5 }} />
                    No audit events recorded yet.
                  </div>
                ) : auditEntries.map(e => {
                  const typeBadge: Record<string, { bg: string; color: string }> = {
                    submit:  { bg: '#dcfce7', color: '#166534' },
                    approve: { bg: '#d1fae5', color: '#065f46' },
                    reject:  { bg: '#fee2e2', color: '#991b1b' },
                    export:  { bg: '#f3e8ff', color: '#6b21a8' },
                    view:    { bg: '#dbeafe', color: '#1e40af' },
                    login:   { bg: '#f1f5f9', color: '#475569' },
                    delete:  { bg: '#ffedd5', color: '#9a3412' },
                  };
                  const badge = typeBadge[e.action_type] || typeBadge.view;
                  return (
                    <div key={e.id} style={{ display: 'flex', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--surface-3)', fontSize: '0.78rem', alignItems: 'flex-start' }}>
                      <span style={{ fontFamily: "'DM Mono', monospace", color: 'var(--text-3)', fontSize: '0.68rem', paddingTop: 2, minWidth: 130, whiteSpace: 'nowrap' }}>
                        {new Date(e.created_at).toLocaleString()}
                      </span>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{e.action}</span>
                        {e.detail && <div style={{ color: 'var(--text-2)', fontSize: '0.72rem', marginTop: 1 }}>{e.detail}</div>}
                      </div>
                      <span style={{ fontSize: '0.6rem', padding: '2px 7px', borderRadius: 8, fontWeight: 700, fontFamily: "'DM Mono', monospace", background: badge.bg, color: badge.color, whiteSpace: 'nowrap' }}>
                        {e.action_type?.toUpperCase()}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 10, fontSize: '0.68rem', color: 'var(--text-3)', fontFamily: "'DM Mono', monospace" }}>
                {auditEntries?.length ?? 0} events recorded this session
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

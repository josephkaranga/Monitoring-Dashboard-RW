import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signIn, signUp, resetPassword } from './authService';
import { writeAuditEntry } from './dataService';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';
import type { UserRole, LoginCredentials, SignupData } from './index';
import { USER_ROLE_LABELS, USER_ROLE_DESCRIPTIONS } from './index';

type AuthMode = 'login' | 'signup' | 'reset';

const ROLE_COLORS: Record<UserRole, string> = {
  policy_monitoring:    '#10b981',
  sector_reporting:     '#0ea5e9',
  local_reporting:      '#f59e0b',
  dashboard_management: '#f43f5e',
  programme_alignment:  '#8b5cf6',
};

export default function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('policy_monitoring');
  const [loginForm, setLoginForm] = useState<LoginCredentials>({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState<Omit<SignupData, 'role'> & { role: UserRole }>({
    email: '', password: '', full_name: '', role: 'policy_monitoring', organization: '',
  });
  const [resetEmail, setResetEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  const validate = useCallback(() => {
    const errs: Record<string, string> = {};
    if (mode === 'login') {
      if (!loginForm.email) errs.email = 'Email is required';
      if (!loginForm.password) errs.password = 'Password is required';
    } else if (mode === 'signup') {
      if (!signupForm.full_name) errs.full_name = 'Full name is required';
      if (!signupForm.email) errs.email = 'Email is required';
      if (!signupForm.password || signupForm.password.length < 8) errs.password = 'Password must be at least 8 characters';
    } else {
      if (!resetEmail) errs.email = 'Email is required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [mode, loginForm, signupForm, resetEmail]);

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const result = await signIn(loginForm);
    if (result.error) toast.error(result.error);
    else { await writeAuditEntry('login', 'User signed in', loginForm.email); toast.success('Welcome back!'); }
    setLoading(false);
  }, [loginForm, validate]);

  const handleSignup = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const result = await signUp({ ...signupForm, role: selectedRole });
    if (result.error) toast.error(result.error);
    else { toast.success('Account created! Check your email to confirm.'); setMode('login'); }
    setLoading(false);
  }, [signupForm, selectedRole, validate]);

  const handleReset = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const result = await resetPassword(resetEmail);
    if (result.error) toast.error(result.error);
    else { toast.success('Password reset email sent!'); setMode('login'); }
    setLoading(false);
  }, [resetEmail, validate]);

  // ── Shared input style ──────────────────────────────────────
  const inputStyle = (hasError?: boolean): React.CSSProperties => ({
    width: '100%', padding: '9px 12px 9px 34px',
    border: `1.5px solid ${hasError ? '#f43f5e' : '#e2e8f0'}`,
    borderRadius: 8, fontSize: '0.84rem', fontFamily: "'DM Sans', sans-serif",
    outline: 'none', transition: '0.2s', background: '#fff', color: '#0f172a',
    boxShadow: hasError ? '0 0 0 3px rgba(244,63,94,0.1)' : 'none',
  });

  const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#64748b', marginBottom: 5 }}>{label}</label>
      {children}
      {error && <div style={{ fontSize: '0.72rem', color: '#f43f5e', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}><i className="fa-solid fa-circle-exclamation" style={{ fontSize: '0.65rem' }} />{error}</div>}
    </div>
  );

  const InputWrap = ({ icon, children }: { icon: string; children: React.ReactNode }) => (
    <div style={{ position: 'relative' }}>
      <i className={`fa-solid ${icon}`} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.8rem', pointerEvents: 'none' }} />
      {children}
    </div>
  );

  const SubmitBtn = ({ label, loadingLabel }: { label: string; loadingLabel: string }) => (
    <button type="submit" disabled={loading} style={{ width: '100%', padding: '11px 0', background: 'linear-gradient(135deg, #0f2744, #1e3a5f)', color: '#fff', border: 'none', borderRadius: 9, fontSize: '0.9rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif", transition: '0.2s', marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loading ? 0.7 : 1 }}>
      {loading && <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite' }} />}
      {loading ? loadingLabel : label}
    </button>
  );

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-green { 0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,.6)}50%{box-shadow:0 0 0 5px rgba(16,185,129,0)} }
        .auth-input:focus { border-color: #0ea5e9 !important; box-shadow: 0 0 0 3px rgba(14,165,233,0.12) !important; }
        .submit-btn-auth:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(15,39,68,0.35); }
        @media (max-width: 900px) { .auth-left { display: none !important; } .auth-right { width: 100% !important; } }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#0c1e38', display: 'flex', alignItems: 'stretch', fontFamily: "'DM Sans', sans-serif" }}>

        {/* ── LEFT PANEL ── */}
        <div className="auth-left" style={{ flex: 1, background: 'linear-gradient(175deg, #0f2744 0%, #0c1e38 60%, #051426 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '60px 56px', position: 'relative', overflow: 'hidden' }}>
          {/* Glow orbs */}
          <div style={{ position: 'absolute', top: -80, right: -80, width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(56,189,248,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: -60, left: -60, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 48 }}>
            <div style={{ width: 52, height: 52, background: 'linear-gradient(135deg, #38bdf8, #0ea5e9)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', boxShadow: '0 8px 24px rgba(14,165,233,0.35)' }}>
              <i className="fa-solid fa-leaf" style={{ fontSize: 22 }} />
            </div>
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.6rem', color: '#fff', letterSpacing: 0.5 }}>NBSAP</div>
              <div style={{ fontSize: '0.7rem', color: '#7dd3fc', fontFamily: "'DM Mono', monospace", letterSpacing: '0.1em', marginTop: 2 }}>MONITORING SYSTEM · RWANDA</div>
            </div>
          </div>

          {/* Tagline */}
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', fontWeight: 700, color: '#fff', lineHeight: 1.25, marginBottom: 20 }}>
            Biodiversity<br /><span style={{ color: '#38bdf8' }}>Monitoring</span><br />for Rwanda
          </div>
          <p style={{ fontSize: '0.88rem', color: '#94a3b8', lineHeight: 1.75, maxWidth: 380, marginBottom: 40 }}>
            National Biodiversity Strategy & Action Plan 2025–2030. Tracking progress against 22 KM-GBF aligned national targets across all 30 districts.
          </p>

          {/* Role pills */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(Object.entries(USER_ROLE_LABELS) as [UserRole, string][]).map(([role, label]) => (
              <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: ROLE_COLORS[role], flexShrink: 0, animation: 'pulse-green 2s infinite' }} />
                <div>
                  <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.78rem' }}>{label}</div>
                  <div style={{ color: '#7dd3fc', fontSize: '0.7rem', marginTop: 1 }}>{USER_ROLE_DESCRIPTIONS[role].substring(0, 55)}…</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="auth-right" style={{ width: 480, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48 }}>
          <div style={{ width: '100%' }}>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
              {mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Reset Password'}
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#64748b', marginBottom: 28 }}>
              {mode === 'login' ? 'Access the NBSAP monitoring dashboard.' : mode === 'signup' ? 'Register your institutional account.' : 'Enter your email to receive a reset link.'}
            </p>

            {/* Mode tabs */}
            {mode !== 'reset' && (
              <div style={{ display: 'flex', gap: 4, background: '#e2e8f0', borderRadius: 10, padding: 3, marginBottom: 24 }}>
                {(['login','signup'] as AuthMode[]).map(m => (
                  <button key={m} onClick={() => setMode(m)}
                    style={{ flex: 1, padding: '8px 0', border: 'none', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: '0.2s', background: mode === m ? '#fff' : 'transparent', color: mode === m ? '#0f172a' : '#64748b', boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.1)' : 'none' }}>
                    {m === 'login' ? 'Sign In' : 'Register'}
                  </button>
                ))}
              </div>
            )}

            {/* ── LOGIN ── */}
            {mode === 'login' && (
              <form onSubmit={handleLogin}>
                <Field label="Email Address" error={errors.email}>
                  <InputWrap icon="fa-envelope">
                    <input type="email" placeholder="your@rema.gov.rw" value={loginForm.email}
                      onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))}
                      className="auth-input" style={inputStyle(!!errors.email)} />
                  </InputWrap>
                </Field>
                <Field label="Password" error={errors.password}>
                  <div style={{ position: 'relative' }}>
                    <i className="fa-solid fa-lock" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.8rem', pointerEvents: 'none' }} />
                    <input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={loginForm.password}
                      onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                      className="auth-input" style={inputStyle(!!errors.password)} />
                    <button type="button" onClick={() => setShowPassword(s => !s)}
                      style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, display: 'flex', alignItems: 'center' }}>
                      <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} style={{ fontSize: '0.85rem' }} />
                    </button>
                  </div>
                </Field>
                <SubmitBtn label="Sign In" loadingLabel="Signing In…" />
                <div style={{ textAlign: 'center', marginTop: 14 }}>
                  <button type="button" onClick={() => setMode('reset')}
                    style={{ background: 'none', border: 'none', color: '#0ea5e9', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif', textDecoration: 'underline'" }}>
                    Forgot password?
                  </button>
                </div>
              </form>
            )}

            {/* ── SIGNUP ── */}
            {mode === 'signup' && (
              <form onSubmit={handleSignup}>
                <Field label="Full Name" error={errors.full_name}>
                  <InputWrap icon="fa-user">
                    <input type="text" placeholder="Jean Baptiste Habimana" value={signupForm.full_name}
                      onChange={e => setSignupForm(f => ({ ...f, full_name: e.target.value }))}
                      className="auth-input" style={inputStyle(!!errors.full_name)} />
                  </InputWrap>
                </Field>
                <Field label="Organization">
                  <InputWrap icon="fa-building">
                    <input type="text" placeholder="REMA / Ministry / District" value={signupForm.organization}
                      onChange={e => setSignupForm(f => ({ ...f, organization: e.target.value }))}
                      className="auth-input" style={inputStyle()} />
                  </InputWrap>
                </Field>
                <Field label="Email Address" error={errors.email}>
                  <InputWrap icon="fa-envelope">
                    <input type="email" placeholder="your@rema.gov.rw" value={signupForm.email}
                      onChange={e => setSignupForm(f => ({ ...f, email: e.target.value }))}
                      className="auth-input" style={inputStyle(!!errors.email)} />
                  </InputWrap>
                </Field>
                <Field label="Access Role">
                  <InputWrap icon="fa-shield-halved">
                    <select value={selectedRole} onChange={e => setSelectedRole(e.target.value as UserRole)}
                      className="auth-input" style={{ ...inputStyle(), cursor: 'pointer' }}>
                      {(Object.entries(USER_ROLE_LABELS) as [UserRole, string][]).map(([role, label]) => (
                        <option key={role} value={role}>{label}</option>
                      ))}
                    </select>
                  </InputWrap>
                  <div style={{ background: '#f0f9ff', borderRadius: 8, padding: '10px 12px', marginTop: 6, fontSize: '0.75rem', color: '#0369a1', lineHeight: 1.5, borderLeft: '3px solid #0ea5e9' }}>
                    {USER_ROLE_DESCRIPTIONS[selectedRole]}
                  </div>
                </Field>
                <Field label="Password" error={errors.password}>
                  <div style={{ position: 'relative' }}>
                    <i className="fa-solid fa-lock" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '0.8rem', pointerEvents: 'none' }} />
                    <input type={showPassword ? 'text' : 'password'} placeholder="Min. 8 characters" value={signupForm.password}
                      onChange={e => setSignupForm(f => ({ ...f, password: e.target.value }))}
                      className="auth-input" style={inputStyle(!!errors.password)} />
                    <button type="button" onClick={() => setShowPassword(s => !s)}
                      style={{ position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, display: 'flex', alignItems: 'center' }}>
                      <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} style={{ fontSize: '0.85rem' }} />
                    </button>
                  </div>
                </Field>
                <SubmitBtn label="Create Account" loadingLabel="Creating Account…" />
              </form>
            )}

            {/* ── RESET ── */}
            {mode === 'reset' && (
              <form onSubmit={handleReset}>
                <Field label="Email Address" error={errors.email}>
                  <InputWrap icon="fa-envelope">
                    <input type="email" placeholder="your@rema.gov.rw" value={resetEmail}
                      onChange={e => setResetEmail(e.target.value)}
                      className="auth-input" style={inputStyle(!!errors.email)} />
                  </InputWrap>
                </Field>
                <SubmitBtn label="Send Reset Link" loadingLabel="Sending…" />
                <div style={{ textAlign: 'center', marginTop: 14 }}>
                  <button type="button" onClick={() => setMode('login')}
                    style={{ background: 'none', border: 'none', color: '#0ea5e9', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                    ← Back to Sign In
                  </button>
                </div>
              </form>
            )}

            {/* Footer */}
            <div style={{ textAlign: 'center', marginTop: 24, fontSize: '0.72rem', color: '#94a3b8', fontFamily: "'DM Mono', monospace" }}>
              NBSAP Monitoring System · Rwanda · 2025–2030
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

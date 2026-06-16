import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Leaf, Lock, Mail, User, Building2 } from 'lucide-react';
import { signIn, signUp, resetPassword } from './authService';
import { writeAuditEntry } from './dataService';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';
import type { UserRole, LoginCredentials, SignupData } from './index';
import { USER_ROLE_LABELS, USER_ROLE_DESCRIPTIONS } from './index';

type AuthMode = 'login' | 'signup' | 'reset';

// ── Inline CSS (no external stylesheet dependencies) ─────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:wght@700&family=DM+Mono:wght@400;500&display=swap');
  
  * { box-sizing: border-box; margin: 0; padding: 0; }
  
  .auth-root {
    min-height: 100vh;
    background: #0c1e38;
    display: flex;
    align-items: stretch;
    font-family: 'DM Sans', sans-serif;
  }

  .auth-left {
    flex: 1;
    background: linear-gradient(175deg, #0f2744 0%, #0c1e38 60%, #051426 100%);
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 60px 56px;
    position: relative;
    overflow: hidden;
  }

  .auth-left::before {
    content: '';
    position: absolute;
    top: -80px; right: -80px;
    width: 350px; height: 350px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(56,189,248,0.12) 0%, transparent 70%);
    pointer-events: none;
  }

  .auth-left::after {
    content: '';
    position: absolute;
    bottom: -60px; left: -60px;
    width: 280px; height: 280px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%);
    pointer-events: none;
  }

  .auth-brand {
    display: flex; align-items: center; gap: 14px; margin-bottom: 48px;
  }
  .auth-brand-icon {
    width: 52px; height: 52px;
    background: linear-gradient(135deg, #38bdf8, #0ea5e9);
    border-radius: 14px;
    display: flex; align-items: center; justify-content: center;
    color: #fff; font-size: 22px;
    box-shadow: 0 8px 24px rgba(14,165,233,0.35);
  }
  .auth-brand h1 {
    font-family: 'Playfair Display', serif;
    font-size: 1.6rem; color: #fff; letter-spacing: 0.5px;
  }
  .auth-brand p {
    font-size: 0.7rem; color: #7dd3fc;
    font-family: 'DM Mono', monospace;
    letter-spacing: 0.1em; margin-top: 2px;
  }
  .auth-tagline {
    font-size: 2rem; font-weight: 700; color: #fff;
    line-height: 1.25; margin-bottom: 20px;
    font-family: 'Playfair Display', serif;
  }
  .auth-tagline span { color: #38bdf8; }
  .auth-desc {
    font-size: 0.88rem; color: #94a3b8; line-height: 1.75;
    max-width: 380px; margin-bottom: 40px;
  }
  .auth-roles {
    display: flex; flex-direction: column; gap: 10px;
  }
  .auth-role-pill {
    display: flex; align-items: center; gap: 10px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px; padding: 10px 14px;
    font-size: 0.78rem;
  }
  .auth-role-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .auth-role-label { color: #fff; font-weight: 600; }
  .auth-role-desc { color: #7dd3fc; font-size: 0.7rem; margin-top: 1px; }

  .auth-right {
    width: 480px;
    background: #f8fafc;
    display: flex; align-items: center; justify-content: center;
    padding: 48px 48px;
  }
  .auth-card { width: 100%; }
  .auth-card h2 {
    font-size: 1.5rem; font-weight: 700; color: #0f172a; margin-bottom: 6px;
    font-family: 'Playfair Display', serif;
  }
  .auth-card p { font-size: 0.82rem; color: #64748b; margin-bottom: 28px; }

  .auth-tabs {
    display: flex; gap: 4px; background: #e2e8f0;
    border-radius: 10px; padding: 3px; margin-bottom: 24px;
  }
  .auth-tab {
    flex: 1; padding: 8px 0; border: none; border-radius: 8px;
    font-size: 0.8rem; font-weight: 600; cursor: pointer;
    font-family: 'DM Sans', sans-serif; transition: 0.2s;
    background: transparent; color: #64748b;
  }
  .auth-tab.active {
    background: #fff; color: #0f172a;
    box-shadow: 0 1px 4px rgba(0,0,0,0.1);
  }

  .form-field { margin-bottom: 14px; }
  .form-field label {
    display: block; font-size: 0.72rem; font-weight: 600;
    letter-spacing: 0.06em; text-transform: uppercase;
    color: #64748b; margin-bottom: 5px;
  }
  .input-wrap { position: relative; }
  .input-wrap .icon {
    position: absolute; left: 11px; top: 50%; transform: translateY(-50%);
    color: #94a3b8; width: 15px; height: 15px;
  }
  .input-wrap input, .input-wrap select {
    width: 100%; padding: 9px 12px 9px 34px;
    border: 1.5px solid #e2e8f0; border-radius: 8px;
    font-size: 0.84rem; font-family: 'DM Sans', sans-serif;
    outline: none; transition: 0.2s; background: #fff;
    color: #0f172a;
  }
  .input-wrap input:focus, .input-wrap select:focus {
    border-color: #0ea5e9;
    box-shadow: 0 0 0 3px rgba(14,165,233,0.12);
  }
  .input-wrap .toggle-eye {
    position: absolute; right: 11px; top: 50%; transform: translateY(-50%);
    background: none; border: none; cursor: pointer; color: #94a3b8; padding: 0;
    display: flex; align-items: center;
  }
  .input-wrap input.error { border-color: #f43f5e; }

  .form-error {
    font-size: 0.72rem; color: #f43f5e; margin-top: 4px;
    display: flex; align-items: center; gap: 4px;
  }

  .role-info {
    background: #f0f9ff; border-radius: 8px; padding: 10px 12px;
    margin-top: 6px; font-size: 0.75rem; color: #0369a1; line-height: 1.5;
    border-left: 3px solid #0ea5e9;
  }

  .submit-btn {
    width: 100%; padding: 11px 0;
    background: linear-gradient(135deg, #0f2744, #1e3a5f);
    color: #fff; border: none; border-radius: 9px;
    font-size: 0.9rem; font-weight: 700; cursor: pointer;
    font-family: 'DM Sans', sans-serif; transition: 0.2s;
    margin-top: 6px; letter-spacing: 0.02em;
    display: flex; align-items: center; justify-content: center; gap: 8px;
  }
  .submit-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 14px rgba(15,39,68,0.35); }
  .submit-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

  .spinner {
    width: 16px; height: 16px; border-radius: 50%;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    animation: spin 0.7s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .divider {
    text-align: center; color: #94a3b8; font-size: 0.76rem;
    margin: 16px 0; position: relative;
  }
  .divider::before, .divider::after {
    content: ''; position: absolute; top: 50%;
    width: calc(50% - 30px); height: 1px; background: #e2e8f0;
  }
  .divider::before { left: 0; }
  .divider::after { right: 0; }

  .auth-link {
    background: none; border: none; color: #0ea5e9;
    font-size: 0.82rem; font-weight: 600; cursor: pointer;
    font-family: 'DM Sans', sans-serif; text-decoration: underline;
  }
  .auth-footer {
    text-align: center; margin-top: 16px; font-size: 0.78rem; color: #94a3b8;
    display: flex; align-items: center; justify-content: center; gap: 6px;
  }

  @media (max-width: 900px) {
    .auth-left { display: none; }
    .auth-right { width: 100%; }
  }
`;

export default function AuthPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('policy_monitoring');

  const [loginForm, setLoginForm] = useState<LoginCredentials>({
    email: '',
    password: '',
  });

  const [signupForm, setSignupForm] = useState<Omit<SignupData, 'role'> & { role: UserRole }>({
    email: '',
    password: '',
    full_name: '',
    role: 'policy_monitoring',
    organization: '',
  });

  const [resetEmail, setResetEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback(() => {
    const errs: Record<string, string> = {};
    if (mode === 'login') {
      if (!loginForm.email) errs.email = 'Email is required';
      if (!loginForm.password) errs.password = 'Password is required';
    } else if (mode === 'signup') {
      if (!signupForm.full_name) errs.full_name = 'Full name is required';
      if (!signupForm.email) errs.email = 'Email is required';
      if (!signupForm.password || signupForm.password.length < 8)
        errs.password = 'Password must be at least 8 characters';
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
    if (result.error) {
      toast.error(result.error);
    } else {
      await writeAuditEntry('login', 'User signed in', loginForm.email);
      toast.success('Welcome back!');
      // Navigation handled by useEffect when user state updates
    }
    setLoading(false);
  }, [loginForm, validate]);

  const handleSignup = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const result = await signUp({ ...signupForm, role: selectedRole });
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Account created! Check your email to confirm.');
      setMode('login');
    }
    setLoading(false);
  }, [signupForm, selectedRole, validate]);

  const handleReset = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const result = await resetPassword(resetEmail);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('Password reset email sent!');
      setMode('login');
    }
    setLoading(false);
  }, [resetEmail, validate]);

  const ROLE_COLORS: Record<UserRole, string> = {
    policy_monitoring: '#10b981',
    sector_reporting: '#0ea5e9',
    local_reporting: '#f59e0b',
    dashboard_management: '#f43f5e',
    programme_alignment: '#8b5cf6',
  };

  return (
    <>
      <style>{styles}</style>
      <div className="auth-root">
        {/* LEFT PANEL */}
        <div className="auth-left">
          <div className="auth-brand">
            <div className="auth-brand-icon">
              <Leaf size={22} />
            </div>
            <div>
              <h1>NBSAP</h1>
              <p>MONITORING SYSTEM · RWANDA</p>
            </div>
          </div>
          <div className="auth-tagline">
            Biodiversity<br />
            <span>Monitoring</span><br />
            for Rwanda
          </div>
          <p className="auth-desc">
            National Biodiversity Strategy & Action Plan 2025–2030.
            Tracking progress against 22 KM-GBF aligned national targets
            across all 30 districts.
          </p>
          <div className="auth-roles">
            {(Object.entries(USER_ROLE_LABELS) as [UserRole, string][]).map(([role, label]) => (
              <div key={role} className="auth-role-pill">
                <div
                  className="auth-role-dot"
                  style={{ background: ROLE_COLORS[role] }}
                />
                <div>
                  <div className="auth-role-label">{label}</div>
                  <div className="auth-role-desc">
                    {USER_ROLE_DESCRIPTIONS[role].substring(0, 55)}…
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="auth-right">
          <div className="auth-card">
            <h2>
              {mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Reset Password'}
            </h2>
            <p>
              {mode === 'login'
                ? 'Access the NBSAP monitoring dashboard.'
                : mode === 'signup'
                ? 'Register your institutional account.'
                : 'Enter your email to receive a reset link.'}
            </p>

            {mode !== 'reset' && (
              <div className="auth-tabs">
                <button
                  className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
                  onClick={() => setMode('login')}
                >
                  Sign In
                </button>
                <button
                  className={`auth-tab ${mode === 'signup' ? 'active' : ''}`}
                  onClick={() => setMode('signup')}
                >
                  Register
                </button>
              </div>
            )}

            {/* LOGIN FORM */}
            {mode === 'login' && (
              <form onSubmit={handleLogin}>
                <div className="form-field">
                  <label>Email Address</label>
                  <div className="input-wrap">
                    <Mail className="icon" />
                    <input
                      type="email"
                      placeholder="your@rema.gov.rw"
                      value={loginForm.email}
                      onChange={(e) =>
                        setLoginForm((f) => ({ ...f, email: e.target.value }))
                      }
                      className={errors.email ? 'error' : ''}
                    />
                  </div>
                  {errors.email && (
                    <div className="form-error">{errors.email}</div>
                  )}
                </div>
                <div className="form-field">
                  <label>Password</label>
                  <div className="input-wrap">
                    <Lock className="icon" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={loginForm.password}
                      onChange={(e) =>
                        setLoginForm((f) => ({ ...f, password: e.target.value }))
                      }
                      className={errors.password ? 'error' : ''}
                    />
                    <button
                      type="button"
                      className="toggle-eye"
                      onClick={() => setShowPassword((s) => !s)}
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {errors.password && (
                    <div className="form-error">{errors.password}</div>
                  )}
                </div>
                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? <div className="spinner" /> : null}
                  {loading ? 'Signing In…' : 'Sign In'}
                </button>
                <div className="auth-footer">
                  <button
                    type="button"
                    className="auth-link"
                    onClick={() => setMode('reset')}
                  >
                    Forgot password?
                  </button>
                </div>
              </form>
            )}

            {/* SIGNUP FORM */}
            {mode === 'signup' && (
              <form onSubmit={handleSignup}>
                <div className="form-field">
                  <label>Full Name</label>
                  <div className="input-wrap">
                    <User className="icon" />
                    <input
                      type="text"
                      placeholder="Jean Baptiste Habimana"
                      value={signupForm.full_name}
                      onChange={(e) =>
                        setSignupForm((f) => ({ ...f, full_name: e.target.value }))
                      }
                      className={errors.full_name ? 'error' : ''}
                    />
                  </div>
                  {errors.full_name && (
                    <div className="form-error">{errors.full_name}</div>
                  )}
                </div>
                <div className="form-field">
                  <label>Organization</label>
                  <div className="input-wrap">
                    <Building2 className="icon" />
                    <input
                      type="text"
                      placeholder="REMA / Ministry / District"
                      value={signupForm.organization}
                      onChange={(e) =>
                        setSignupForm((f) => ({ ...f, organization: e.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="form-field">
                  <label>Email Address</label>
                  <div className="input-wrap">
                    <Mail className="icon" />
                    <input
                      type="email"
                      placeholder="your@rema.gov.rw"
                      value={signupForm.email}
                      onChange={(e) =>
                        setSignupForm((f) => ({ ...f, email: e.target.value }))
                      }
                      className={errors.email ? 'error' : ''}
                    />
                  </div>
                  {errors.email && (
                    <div className="form-error">{errors.email}</div>
                  )}
                </div>
                <div className="form-field">
                  <label>Access Role</label>
                  <div className="input-wrap">
                    <Lock className="icon" />
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                    >
                      {(Object.entries(USER_ROLE_LABELS) as [UserRole, string][]).map(
                        ([role, label]) => (
                          <option key={role} value={role}>
                            {label}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                  <div className="role-info">
                    {USER_ROLE_DESCRIPTIONS[selectedRole]}
                  </div>
                </div>
                <div className="form-field">
                  <label>Password</label>
                  <div className="input-wrap">
                    <Lock className="icon" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min. 8 characters"
                      value={signupForm.password}
                      onChange={(e) =>
                        setSignupForm((f) => ({ ...f, password: e.target.value }))
                      }
                      className={errors.password ? 'error' : ''}
                    />
                    <button
                      type="button"
                      className="toggle-eye"
                      onClick={() => setShowPassword((s) => !s)}
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {errors.password && (
                    <div className="form-error">{errors.password}</div>
                  )}
                </div>
                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? <div className="spinner" /> : null}
                  {loading ? 'Creating Account…' : 'Create Account'}
                </button>
              </form>
            )}

            {/* RESET FORM */}
            {mode === 'reset' && (
              <form onSubmit={handleReset}>
                <div className="form-field">
                  <label>Email Address</label>
                  <div className="input-wrap">
                    <Mail className="icon" />
                    <input
                      type="email"
                      placeholder="your@rema.gov.rw"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className={errors.email ? 'error' : ''}
                    />
                  </div>
                  {errors.email && (
                    <div className="form-error">{errors.email}</div>
                  )}
                </div>
                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? <div className="spinner" /> : 'Send Reset Link'}
                </button>
                <div className="auth-footer">
                  <button
                    type="button"
                    className="auth-link"
                    onClick={() => setMode('login')}
                  >
                    ← Back to Sign In
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

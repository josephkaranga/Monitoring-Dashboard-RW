import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { signIn, signUp, resetPassword, updatePassword } from '../services/authService';
import { writeAuditEntry } from '../services/dataService';
import { useAuth } from '../services/AuthContext';
import { supabase } from '../utils/supabase';
import toast from 'react-hot-toast';
import type { UserRole, LoginCredentials, SignupData } from '../types/index';
import { USER_ROLE_LABELS, USER_ROLE_DESCRIPTIONS } from '../types/index';

type AuthMode = 'login' | 'signup' | 'reset' | 'set-password';

const inputBase: React.CSSProperties = {
  width: '100%', padding: '10px 12px',
  border: '1px solid #d1d5db', borderRadius: 6,
  fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif",
  outline: 'none', transition: 'border-color 0.15s',
  background: '#fff', color: '#111827',
};
const inputError: React.CSSProperties = {
  ...inputBase, border: '1px solid #ef4444',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.8rem', fontWeight: 500,
  color: '#374151', marginBottom: 4,
};
const fieldWrap: React.CSSProperties = { marginBottom: 16 };

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isPasswordRecovery } = useAuth();
  const [mode, setMode] = useState<AuthMode>(
    searchParams.get('mode') === 'set-password' ? 'set-password' : 'login'
  );
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('policy_monitoring');
  const [loginForm, setLoginForm] = useState<LoginCredentials>({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState<Omit<SignupData, 'role'> & { role: UserRole }>({
    email: '', password: '', full_name: '', role: 'policy_monitoring', organization: '',
  });
  const [resetEmail, setResetEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    const m = searchParams.get('mode');
    if (m === 'set-password' && mode !== 'set-password') setMode('set-password');
  }, [searchParams, mode]);

  useEffect(() => {
    if (isPasswordRecovery && mode !== 'set-password') setMode('set-password');
  }, [isPasswordRecovery, mode]);

  useEffect(() => {
    // Block the dashboard redirect when this is a password-recovery link.
    // ?type=recovery persists in the URL after Supabase strips ?code=,
    // so it is a reliable signal even after the PKCE exchange completes.
    const isRecoveryLink = new URLSearchParams(window.location.search).get('type') === 'recovery';
    if (user && mode !== 'set-password' && !isPasswordRecovery && !isRecoveryLink) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, mode, isPasswordRecovery, navigate]);

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
    else {
      toast.success('Registration submitted. Awaiting administrator approval.');
      setMode('login');
    }
    setLoading(false);
  }, [signupForm, selectedRole, validate]);

  const handleReset = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    const result = await resetPassword(resetEmail);
    if (result.error) toast.error(result.error);
    else { toast.success('Password reset email sent.'); setMode('login'); }
    setLoading(false);
  }, [resetEmail, validate]);

  const handleSetPassword = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      const result = await updatePassword(newPassword);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Password updated successfully! Please sign in with your new password.');
        await supabase.auth.signOut();
        setNewPassword('');
        setConfirmPassword('');
        setMode('login');
        navigate('/auth', { replace: true });
      }
    } catch {
      toast.error('Something went wrong. Please request a new reset link.');
    } finally {
      setLoading(false);
    }
  }, [newPassword, confirmPassword, navigate]);

  const btnStyle: React.CSSProperties = {
    width: '100%', padding: '10px 0', background: '#111827', color: '#fff',
    border: 'none', borderRadius: 6, fontSize: '0.875rem', fontWeight: 600,
    cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'DM Sans', sans-serif",
    marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    opacity: loading ? 0.6 : 1,
  };

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .auth-input:focus { border-color: #2563eb !important; box-shadow: 0 0 0 2px rgba(37,99,235,0.15) !important; }
      `}</style>

      <div style={{
        minHeight: '100vh', background: '#f3f4f6',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'DM Sans', sans-serif", padding: 24,
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{
              width: 44, height: 44, background: '#111827', borderRadius: 10,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', marginBottom: 16,
            }}>
              <i className="fa-solid fa-leaf" style={{ fontSize: 20 }} />
            </div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111827', margin: 0 }}>
              NBSAP Monitoring System
            </h1>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: 4 }}>Rwanda 2025–2030</p>
          </div>

          {/* Card */}
          <div style={{
            background: '#fff', borderRadius: 8, padding: 28,
            border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827', marginBottom: 4 }}>
              {mode === 'login' ? 'Sign in' : mode === 'signup' ? 'Create account' : mode === 'set-password' ? 'Set new password' : 'Reset password'}
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: 24 }}>
              {mode === 'login' ? 'Enter your credentials to continue.' : mode === 'signup' ? 'Register for a new account.' : mode === 'set-password' ? 'Choose a new password.' : 'We\'ll send you a reset link.'}
            </p>

            {/* Tabs */}
            {mode !== 'reset' && mode !== 'set-password' && (
              <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e5e7eb', marginBottom: 24 }}>
                {(['login', 'signup'] as AuthMode[]).map(m => (
                  <button key={m} type="button" onClick={() => setMode(m)}
                    style={{
                      flex: 1, padding: '8px 0', border: 'none', background: 'none',
                      fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                      fontFamily: "'DM Sans', sans-serif",
                      color: mode === m ? '#111827' : '#9ca3af',
                      borderBottom: mode === m ? '2px solid #111827' : '2px solid transparent',
                      marginBottom: -1,
                    }}>
                    {m === 'login' ? 'Sign In' : 'Register'}
                  </button>
                ))}
              </div>
            )}

            {/* LOGIN */}
            {mode === 'login' && (
              <form onSubmit={handleLogin} noValidate>
                <div style={fieldWrap}>
                  <label style={labelStyle}>Email</label>
                  <input type="email" placeholder="you@example.com" value={loginForm.email}
                    onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))}
                    className="auth-input" style={errors.email ? inputError : inputBase} autoComplete="email" />
                  {errors.email && <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: 4 }}>{errors.email}</div>}
                </div>
                <div style={fieldWrap}>
                  <label style={labelStyle}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPassword ? 'text' : 'password'} placeholder="Enter password" value={loginForm.password}
                      onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                      className="auth-input" style={{ ...(errors.password ? inputError : inputBase), paddingRight: 36 }} autoComplete="current-password" />
                    <button type="button" onClick={() => setShowPassword(s => !s)}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0 }}>
                      <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} style={{ fontSize: '0.8rem' }} />
                    </button>
                  </div>
                  {errors.password && <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: 4 }}>{errors.password}</div>}
                </div>
                <button type="submit" disabled={loading} style={btnStyle}>
                  {loading && <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.6s linear infinite' }} />}
                  {loading ? 'Signing in...' : 'Sign in'}
                </button>
                <div style={{ textAlign: 'center', marginTop: 12 }}>
                  <button type="button" onClick={() => setMode('reset')}
                    style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.8rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                    Forgot password?
                  </button>
                </div>
              </form>
            )}

            {/* SIGNUP */}
            {mode === 'signup' && (
              <form onSubmit={handleSignup} noValidate>
                <div style={fieldWrap}>
                  <label style={labelStyle}>Full name</label>
                  <input type="text" placeholder="Jean Baptiste Habimana" value={signupForm.full_name}
                    onChange={e => setSignupForm(f => ({ ...f, full_name: e.target.value }))}
                    className="auth-input" style={errors.full_name ? inputError : inputBase} autoComplete="name" />
                  {errors.full_name && <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: 4 }}>{errors.full_name}</div>}
                </div>
                <div style={fieldWrap}>
                  <label style={labelStyle}>Organisation</label>
                  <input type="text" placeholder="REMA, Ministry, District..." value={signupForm.organization}
                    onChange={e => setSignupForm(f => ({ ...f, organization: e.target.value }))}
                    className="auth-input" style={inputBase} autoComplete="organization" />
                </div>
                <div style={fieldWrap}>
                  <label style={labelStyle}>Email</label>
                  <input type="email" placeholder="you@example.com" value={signupForm.email}
                    onChange={e => setSignupForm(f => ({ ...f, email: e.target.value }))}
                    className="auth-input" style={errors.email ? inputError : inputBase} autoComplete="email" />
                  {errors.email && <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: 4 }}>{errors.email}</div>}
                </div>
                <div style={fieldWrap}>
                  <label style={labelStyle}>Role</label>
                  <select value={selectedRole} onChange={e => setSelectedRole(e.target.value as UserRole)}
                    style={{ ...inputBase, cursor: 'pointer' }}>
                    {(Object.entries(USER_ROLE_LABELS) as [UserRole, string][]).map(([role, label]) => (
                      <option key={role} value={role}>{label}</option>
                    ))}
                  </select>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 6, lineHeight: 1.4 }}>
                    {USER_ROLE_DESCRIPTIONS[selectedRole]}
                  </p>
                </div>
                <div style={fieldWrap}>
                  <label style={labelStyle}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPassword ? 'text' : 'password'} placeholder="Min. 8 characters" value={signupForm.password}
                      onChange={e => setSignupForm(f => ({ ...f, password: e.target.value }))}
                      className="auth-input" style={{ ...(errors.password ? inputError : inputBase), paddingRight: 36 }} autoComplete="new-password" />
                    <button type="button" onClick={() => setShowPassword(s => !s)}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0 }}>
                      <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} style={{ fontSize: '0.8rem' }} />
                    </button>
                  </div>
                  {errors.password && <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: 4 }}>{errors.password}</div>}
                </div>
                <button type="submit" disabled={loading} style={btnStyle}>
                  {loading && <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.6s linear infinite' }} />}
                  {loading ? 'Creating account...' : 'Create account'}
                </button>
              </form>
            )}

            {/* RESET */}
            {mode === 'reset' && (
              <form onSubmit={handleReset} noValidate>
                <div style={fieldWrap}>
                  <label style={labelStyle}>Email</label>
                  <input type="email" placeholder="you@example.com" value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    className="auth-input" style={errors.email ? inputError : inputBase} autoComplete="email" />
                  {errors.email && <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: 4 }}>{errors.email}</div>}
                </div>
                <button type="submit" disabled={loading} style={btnStyle}>
                  {loading && <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.6s linear infinite' }} />}
                  {loading ? 'Sending...' : 'Send reset link'}
                </button>
                <div style={{ textAlign: 'center', marginTop: 12 }}>
                  <button type="button" onClick={() => setMode('login')}
                    style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.8rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                    Back to sign in
                  </button>
                </div>
              </form>
            )}

            {/* SET NEW PASSWORD */}
            {mode === 'set-password' && (
              <form onSubmit={handleSetPassword} noValidate>
                <div style={fieldWrap}>
                  <label style={labelStyle}>New password</label>
                  <div style={{ position: 'relative' }}>
                    <input type={showPassword ? 'text' : 'password'} placeholder="Min. 8 characters" value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="auth-input" style={inputBase} autoComplete="new-password" autoFocus />
                    <button type="button" onClick={() => setShowPassword(p => !p)}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0 }}>
                      <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} style={{ fontSize: '0.8rem' }} />
                    </button>
                  </div>
                  {newPassword.length > 0 && newPassword.length < 8 && (
                    <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: 4 }}>Must be at least 8 characters</div>
                  )}
                </div>
                <div style={fieldWrap}>
                  <label style={labelStyle}>Confirm password</label>
                  <input type={showPassword ? 'text' : 'password'} placeholder="Re-enter password" value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="auth-input" style={confirmPassword && confirmPassword !== newPassword ? inputError : inputBase} autoComplete="new-password" />
                  {confirmPassword && confirmPassword !== newPassword && (
                    <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: 4 }}>Passwords do not match</div>
                  )}
                </div>
                <button type="submit" disabled={loading || newPassword.length < 8 || newPassword !== confirmPassword}
                  style={{ ...btnStyle, opacity: (loading || newPassword.length < 8 || newPassword !== confirmPassword) ? 0.4 : 1 }}>
                  {loading && <div style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.6s linear infinite' }} />}
                  {loading ? 'Updating...' : 'Set password'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

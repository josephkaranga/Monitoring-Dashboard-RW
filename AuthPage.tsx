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

// ── Shared styles (defined outside component to avoid re-creation) ──
const inputBase: React.CSSProperties = {
  width: '100%', padding: '9px 12px 9px 34px',
  border: '1.5px solid #e2e8f0', borderRadius: 8,
  fontSize: '0.84rem', fontFamily: "'DM Sans', sans-serif",
  outline: 'none', transition: 'border-color 0.2s',
  background: '#fff', color: '#0f172a',
};
const inputError: React.CSSProperties = {
  ...inputBase,
  border: '1.5px solid #f43f5e',
  boxShadow: '0 0 0 3px rgba(244,63,94,0.1)',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.72rem', fontWeight: 600,
  letterSpacing: '0.06em', textTransform: 'uppercase',
  color: '#64748b', marginBottom: 5,
};
const fieldWrap: React.CSSProperties = { marginBottom: 14 };
const iconStyle: React.CSSProperties = {
  position: 'absolute', left: 11, top: '50%',
  transform: 'translateY(-50%)', color: '#94a3b8',
  fontSize: '0.8rem', pointerEvents: 'none',
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
      toast.success('Registration submitted! Awaiting REMA Admin approval.');
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
    else { toast.success('Password reset email sent!'); setMode('login'); }
    setLoading(false);
  }, [resetEmail, validate]);

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        
        .auth-input:focus { 
          border-color: #0ea5e9 !important; 
          box-shadow: 0 0 0 4px rgba(14,165,233,0.15) !important; 
        }
        
        .auth-input:focus + .floating-label,
        .auth-input:not(:placeholder-shown) + .floating-label {
          top: -8px;
          font-size: 0.7rem;
          color: #0ea5e9;
          background: #fff;
          padding: 0 6px;
        }
        
        .role-card {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .role-card:hover {
          transform: translateX(8px);
          background: rgba(255,255,255,0.08) !important;
          border-color: rgba(255,255,255,0.15) !important;
        }
        
        .submit-btn {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 24px rgba(14,165,233,0.3);
        }
        
        .submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        
        @media (max-width: 900px) { 
          .auth-left { display: none !important; } 
          .auth-right { width: 100% !important; max-width: 100% !important; } 
        }
      `}</style>

      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #0c4a6e 0%, #075985 50%, #0369a1 100%)',
        display: 'flex', 
        alignItems: 'stretch', 
        fontFamily: "'DM Sans', sans-serif",
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Animated background elements */}
        <div style={{ position: 'absolute', top: '10%', left: '5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)', animation: 'float 6s ease-in-out infinite', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '15%', right: '10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(251,191,36,0.12) 0%, transparent 70%)', animation: 'float 8s ease-in-out infinite', animationDelay: '1s', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(56,189,248,0.08) 0%, transparent 70%)', animation: 'float 10s ease-in-out infinite', animationDelay: '2s', pointerEvents: 'none', transform: 'translate(-50%, -50%)' }} />

        {/* ── LEFT PANEL ── */}
        <div className="auth-left" style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          padding: '60px 56px', 
          position: 'relative',
          zIndex: 1
        }}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 48, animation: 'slideIn 0.6s ease-out' }}>
            <div style={{ 
              width: 64, 
              height: 64, 
              background: 'linear-gradient(135deg, #10b981, #059669)', 
              borderRadius: 16, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: '#fff', 
              boxShadow: '0 12px 32px rgba(16,185,129,0.4)',
              position: 'relative'
            }}>
              <i className="fa-solid fa-leaf" style={{ fontSize: 28, animation: 'pulse 3s ease-in-out infinite' }} />
              <div style={{ position: 'absolute', inset: -2, borderRadius: 16, background: 'linear-gradient(135deg, #10b981, #059669)', opacity: 0.3, filter: 'blur(8px)', zIndex: -1 }} />
            </div>
            <div>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', color: '#fff', letterSpacing: 0.5, fontWeight: 700 }}>NBSAP</div>
              <div style={{ fontSize: '0.7rem', color: '#7dd3fc', fontFamily: "'DM Mono', monospace", letterSpacing: '0.15em', marginTop: 2 }}>RWANDA · 2025–2030</div>
            </div>
          </div>

          <div style={{ 
            fontFamily: "'Playfair Display', serif", 
            fontSize: '2.5rem', 
            fontWeight: 700, 
            color: '#fff', 
            lineHeight: 1.2, 
            marginBottom: 24,
            animation: 'slideIn 0.6s ease-out 0.1s backwards'
          }}>
            National Biodiversity<br />
            <span style={{ 
              background: 'linear-gradient(135deg, #10b981, #fbbf24)', 
              WebkitBackgroundClip: 'text', 
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>Strategy & Action Plan</span>
          </div>
          
          <p style={{ 
            fontSize: '0.95rem', 
            color: '#bae6fd', 
            lineHeight: 1.8, 
            maxWidth: 420, 
            marginBottom: 48,
            animation: 'slideIn 0.6s ease-out 0.2s backwards'
          }}>
            Comprehensive monitoring system tracking progress across 22 KM-GBF aligned national targets, covering all 30 districts of Rwanda.
          </p>

          {/* Stats */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: 16, 
            marginBottom: 48,
            animation: 'slideIn 0.6s ease-out 0.3s backwards'
          }}>
            {[
              { icon: 'fa-bullseye', value: '22', label: 'National Targets' },
              { icon: 'fa-map-location-dot', value: '30', label: 'Districts' },
              { icon: 'fa-chart-line', value: '82', label: 'Indicators' }
            ].map((stat, i) => (
              <div key={i} style={{ 
                background: 'rgba(255,255,255,0.08)', 
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.12)', 
                borderRadius: 12, 
                padding: '16px 12px',
                textAlign: 'center'
              }}>
                <i className={`fa-solid ${stat.icon}`} style={{ fontSize: '1.5rem', color: '#10b981', marginBottom: 8 }} />
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#fff', marginBottom: 4 }}>{stat.value}</div>
                <div style={{ fontSize: '0.7rem', color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Roles */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 10,
            animation: 'slideIn 0.6s ease-out 0.4s backwards'
          }}>
            <div style={{ fontSize: '0.75rem', color: '#7dd3fc', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, fontWeight: 600 }}>Access Roles</div>
            {(Object.entries(USER_ROLE_LABELS) as [UserRole, string][]).slice(0, 3).map(([role, label], i) => (
              <div key={role} className="role-card" style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 12, 
                background: 'rgba(255,255,255,0.06)', 
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.1)', 
                borderRadius: 12, 
                padding: '12px 16px',
                animation: `slideIn 0.6s ease-out ${0.5 + i * 0.1}s backwards`
              }}>
                <div style={{ 
                  width: 10, 
                  height: 10, 
                  borderRadius: '50%', 
                  background: ROLE_COLORS[role], 
                  flexShrink: 0,
                  boxShadow: `0 0 12px ${ROLE_COLORS[role]}`
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: '#fff', fontWeight: 600, fontSize: '0.82rem', marginBottom: 2 }}>{label}</div>
                  <div style={{ color: '#7dd3fc', fontSize: '0.7rem', lineHeight: 1.4 }}>{USER_ROLE_DESCRIPTIONS[role].substring(0, 60)}…</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="auth-right" style={{ 
          width: 520, 
          maxWidth: '100%',
          background: '#ffffff', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: 48,
          boxShadow: '-20px 0 60px rgba(0,0,0,0.2)',
          position: 'relative',
          zIndex: 2
        }}>
          <div style={{ width: '100%', maxWidth: 400, animation: 'fadeIn 0.8s ease-out' }}>
            <h2 style={{ 
              fontFamily: "'Playfair Display', serif", 
              fontSize: '2rem', 
              fontWeight: 700, 
              color: '#0f172a', 
              marginBottom: 8,
              background: 'linear-gradient(135deg, #0c4a6e, #0369a1)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              {mode === 'login' ? 'Welcome Back' : mode === 'signup' ? 'Create Account' : 'Reset Password'}
            </h2>
            <p style={{ fontSize: '0.88rem', color: '#64748b', marginBottom: 32, lineHeight: 1.6 }}>
              {mode === 'login' ? 'Sign in to access the NBSAP monitoring dashboard and track biodiversity progress.' : mode === 'signup' ? 'Register your institutional account. A REMA Administrator will review and approve your request.' : 'Enter your email address to receive a password reset link.'}
            </p>

            {/* Mode tabs */}
            {mode !== 'reset' && (
              <div style={{ 
                display: 'flex', 
                gap: 6, 
                background: '#f1f5f9', 
                borderRadius: 12, 
                padding: 4, 
                marginBottom: 32 
              }}>
                {(['login', 'signup'] as AuthMode[]).map(m => (
                  <button key={m} type="button" onClick={() => setMode(m)}
                    style={{ 
                      flex: 1, 
                      padding: '10px 0', 
                      border: 'none', 
                      borderRadius: 10, 
                      fontSize: '0.85rem', 
                      fontWeight: 600, 
                      cursor: 'pointer', 
                      fontFamily: "'DM Sans', sans-serif", 
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
                      background: mode === m ? '#fff' : 'transparent', 
                      color: mode === m ? '#0c4a6e' : '#64748b', 
                      boxShadow: mode === m ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
                      transform: mode === m ? 'scale(1.02)' : 'scale(1)'
                    }}>
                    {m === 'login' ? 'Sign In' : 'Register'}
                  </button>
                ))}
              </div>
            )}

            {/* ── LOGIN ── */}
            {mode === 'login' && (
              <form onSubmit={handleLogin} noValidate>
                {/* Email */}
                <div style={{ ...fieldWrap, position: 'relative' }}>
                  <div style={{ position: 'relative' }}>
                    <i className="fa-solid fa-envelope" style={{ ...iconStyle, color: '#0ea5e9' }} />
                    <input
                      type="email"
                      placeholder="your@rema.gov.rw"
                      value={loginForm.email}
                      onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))}
                      className="auth-input"
                      style={{
                        ...inputBase,
                        ...(errors.email ? { border: '2px solid #f43f5e', boxShadow: '0 0 0 4px rgba(244,63,94,0.1)' } : {}),
                        borderRadius: 12,
                        padding: '14px 12px 14px 42px',
                        fontSize: '0.9rem',
                        border: '2px solid #e2e8f0',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                      autoComplete="email"
                    />
                    <label className="floating-label" style={{
                      position: 'absolute',
                      left: 42,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '0.9rem',
                      color: '#94a3b8',
                      pointerEvents: 'none',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      fontWeight: 500
                    }}>Email Address</label>
                  </div>
                  {errors.email && <div style={{ fontSize: '0.75rem', color: '#f43f5e', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="fa-solid fa-circle-exclamation" />
                    {errors.email}
                  </div>}
                </div>

                {/* Password */}
                <div style={{ ...fieldWrap, position: 'relative' }}>
                  <div style={{ position: 'relative' }}>
                    <i className="fa-solid fa-lock" style={{ ...iconStyle, color: '#0ea5e9' }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={loginForm.password}
                      onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                      className="auth-input"
                      style={{
                        ...inputBase,
                        ...(errors.password ? { border: '2px solid #f43f5e', boxShadow: '0 0 0 4px rgba(244,63,94,0.1)' } : {}),
                        borderRadius: 12,
                        padding: '14px 42px 14px 42px',
                        fontSize: '0.9rem',
                        border: '2px solid #e2e8f0',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                      autoComplete="current-password"
                    />
                    <label className="floating-label" style={{
                      position: 'absolute',
                      left: 42,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '0.9rem',
                      color: '#94a3b8',
                      pointerEvents: 'none',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      fontWeight: 500
                    }}>Password</label>
                    <button type="button" onClick={() => setShowPassword(s => !s)}
                      style={{ 
                        position: 'absolute', 
                        right: 14, 
                        top: '50%', 
                        transform: 'translateY(-50%)', 
                        background: 'none', 
                        border: 'none', 
                        cursor: 'pointer', 
                        color: '#94a3b8', 
                        padding: 8,
                        borderRadius: 8,
                        display: 'flex', 
                        alignItems: 'center',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                      <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} style={{ fontSize: '0.9rem' }} />
                    </button>
                  </div>
                  {errors.password && <div style={{ fontSize: '0.75rem', color: '#f43f5e', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="fa-solid fa-circle-exclamation" />
                    {errors.password}
                  </div>}
                </div>

                <button type="submit" disabled={loading} className="submit-btn"
                  style={{ 
                    width: '100%', 
                    padding: '14px 0', 
                    background: 'linear-gradient(135deg, #0c4a6e, #0369a1)', 
                    color: '#fff', 
                    border: 'none', 
                    borderRadius: 12, 
                    fontSize: '0.95rem', 
                    fontWeight: 700, 
                    cursor: loading ? 'not-allowed' : 'pointer', 
                    fontFamily: "'DM Sans', sans-serif", 
                    marginTop: 8, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: 10, 
                    opacity: loading ? 0.7 : 1,
                    boxShadow: '0 4px 12px rgba(12,74,110,0.3)'
                  }}>
                  {loading && <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite' }} />}
                  {loading ? 'Signing In…' : 'Sign In'}
                  {!loading && <i className="fa-solid fa-arrow-right" style={{ fontSize: '0.85rem' }} />}
                </button>

                <div style={{ textAlign: 'center', marginTop: 20 }}>
                  <button type="button" onClick={() => setMode('reset')}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: '#0369a1', 
                      fontSize: '0.85rem', 
                      fontWeight: 600, 
                      cursor: 'pointer', 
                      fontFamily: "'DM Sans', sans-serif",
                      padding: '8px 16px',
                      borderRadius: 8,
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                    Forgot password?
                  </button>
                </div>
              </form>
            )}

            {/* ── SIGNUP ── */}
            {mode === 'signup' && (
              <form onSubmit={handleSignup} noValidate>
                {/* Full Name */}
                <div style={{ ...fieldWrap, position: 'relative' }}>
                  <div style={{ position: 'relative' }}>
                    <i className="fa-solid fa-user" style={{ ...iconStyle, color: '#0ea5e9' }} />
                    <input
                      type="text"
                      placeholder=" "
                      value={signupForm.full_name}
                      onChange={e => setSignupForm(f => ({ ...f, full_name: e.target.value }))}
                      className="auth-input"
                      style={{
                        ...inputBase,
                        ...(errors.full_name ? { border: '2px solid #f43f5e', boxShadow: '0 0 0 4px rgba(244,63,94,0.1)' } : {}),
                        borderRadius: 12,
                        padding: '14px 12px 14px 42px',
                        fontSize: '0.9rem',
                        border: '2px solid #e2e8f0',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                      autoComplete="name"
                    />
                    <label className="floating-label" style={{
                      position: 'absolute',
                      left: 42,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '0.9rem',
                      color: '#94a3b8',
                      pointerEvents: 'none',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      fontWeight: 500
                    }}>Full Name</label>
                  </div>
                  {errors.full_name && <div style={{ fontSize: '0.75rem', color: '#f43f5e', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="fa-solid fa-circle-exclamation" />
                    {errors.full_name}
                  </div>}
                </div>

                {/* Organization */}
                <div style={{ ...fieldWrap, position: 'relative' }}>
                  <div style={{ position: 'relative' }}>
                    <i className="fa-solid fa-building" style={{ ...iconStyle, color: '#0ea5e9' }} />
                    <input
                      type="text"
                      placeholder=" "
                      value={signupForm.organization}
                      onChange={e => setSignupForm(f => ({ ...f, organization: e.target.value }))}
                      className="auth-input"
                      style={{
                        ...inputBase,
                        borderRadius: 12,
                        padding: '14px 12px 14px 42px',
                        fontSize: '0.9rem',
                        border: '2px solid #e2e8f0',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                      autoComplete="organization"
                    />
                    <label className="floating-label" style={{
                      position: 'absolute',
                      left: 42,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '0.9rem',
                      color: '#94a3b8',
                      pointerEvents: 'none',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      fontWeight: 500
                    }}>Organization (Optional)</label>
                  </div>
                </div>

                {/* Email */}
                <div style={{ ...fieldWrap, position: 'relative' }}>
                  <div style={{ position: 'relative' }}>
                    <i className="fa-solid fa-envelope" style={{ ...iconStyle, color: '#0ea5e9' }} />
                    <input
                      type="email"
                      placeholder=" "
                      value={signupForm.email}
                      onChange={e => setSignupForm(f => ({ ...f, email: e.target.value }))}
                      className="auth-input"
                      style={{
                        ...inputBase,
                        ...(errors.email ? { border: '2px solid #f43f5e', boxShadow: '0 0 0 4px rgba(244,63,94,0.1)' } : {}),
                        borderRadius: 12,
                        padding: '14px 12px 14px 42px',
                        fontSize: '0.9rem',
                        border: '2px solid #e2e8f0',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                      autoComplete="email"
                    />
                    <label className="floating-label" style={{
                      position: 'absolute',
                      left: 42,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '0.9rem',
                      color: '#94a3b8',
                      pointerEvents: 'none',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      fontWeight: 500
                    }}>Email Address</label>
                  </div>
                  {errors.email && <div style={{ fontSize: '0.75rem', color: '#f43f5e', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="fa-solid fa-circle-exclamation" />
                    {errors.email}
                  </div>}
                </div>

                {/* Role */}
                <div style={{ ...fieldWrap, position: 'relative' }}>
                  <div style={{ position: 'relative' }}>
                    <i className="fa-solid fa-shield-halved" style={{ ...iconStyle, color: '#0ea5e9' }} />
                    <select
                      value={selectedRole}
                      onChange={e => setSelectedRole(e.target.value as UserRole)}
                      className="auth-input"
                      style={{
                        ...inputBase,
                        borderRadius: 12,
                        padding: '14px 12px 14px 42px',
                        fontSize: '0.9rem',
                        border: '2px solid #e2e8f0',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        cursor: 'pointer',
                        appearance: 'none',
                        backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%2394a3b8\' d=\'M6 9L1 4h10z\'/%3E%3C/svg%3E")',
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 14px center'
                      }}
                    >
                      {(Object.entries(USER_ROLE_LABELS) as [UserRole, string][]).map(([role, label]) => (
                        <option key={role} value={role}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ background: '#f0f9ff', borderRadius: 10, padding: '12px 14px', marginTop: 8, fontSize: '0.8rem', color: '#0369a1', lineHeight: 1.6, borderLeft: '3px solid #0ea5e9' }}>
                    <i className="fa-solid fa-info-circle" style={{ marginRight: 6 }} />
                    {USER_ROLE_DESCRIPTIONS[selectedRole]}
                  </div>
                </div>

                {/* Password */}
                <div style={{ ...fieldWrap, position: 'relative' }}>
                  <div style={{ position: 'relative' }}>
                    <i className="fa-solid fa-lock" style={{ ...iconStyle, color: '#0ea5e9' }} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder=" "
                      value={signupForm.password}
                      onChange={e => setSignupForm(f => ({ ...f, password: e.target.value }))}
                      className="auth-input"
                      style={{
                        ...inputBase,
                        ...(errors.password ? { border: '2px solid #f43f5e', boxShadow: '0 0 0 4px rgba(244,63,94,0.1)' } : {}),
                        borderRadius: 12,
                        padding: '14px 42px 14px 42px',
                        fontSize: '0.9rem',
                        border: '2px solid #e2e8f0',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                      autoComplete="new-password"
                    />
                    <label className="floating-label" style={{
                      position: 'absolute',
                      left: 42,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '0.9rem',
                      color: '#94a3b8',
                      pointerEvents: 'none',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      fontWeight: 500
                    }}>Password (Min. 8 characters)</label>
                    <button type="button" onClick={() => setShowPassword(s => !s)}
                      style={{ 
                        position: 'absolute', 
                        right: 14, 
                        top: '50%', 
                        transform: 'translateY(-50%)', 
                        background: 'none', 
                        border: 'none', 
                        cursor: 'pointer', 
                        color: '#94a3b8', 
                        padding: 8,
                        borderRadius: 8,
                        display: 'flex', 
                        alignItems: 'center',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                      <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`} style={{ fontSize: '0.9rem' }} />
                    </button>
                  </div>
                  {errors.password && <div style={{ fontSize: '0.75rem', color: '#f43f5e', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="fa-solid fa-circle-exclamation" />
                    {errors.password}
                  </div>}
                </div>

                <button type="submit" disabled={loading} className="submit-btn"
                  style={{ 
                    width: '100%', 
                    padding: '14px 0', 
                    background: 'linear-gradient(135deg, #0c4a6e, #0369a1)', 
                    color: '#fff', 
                    border: 'none', 
                    borderRadius: 12, 
                    fontSize: '0.95rem', 
                    fontWeight: 700, 
                    cursor: loading ? 'not-allowed' : 'pointer', 
                    fontFamily: "'DM Sans', sans-serif", 
                    marginTop: 8, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: 10, 
                    opacity: loading ? 0.7 : 1,
                    boxShadow: '0 4px 12px rgba(12,74,110,0.3)'
                  }}>
                  {loading && <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite' }} />}
                  {loading ? 'Creating Account…' : 'Create Account'}
                  {!loading && <i className="fa-solid fa-arrow-right" style={{ fontSize: '0.85rem' }} />}
                </button>
              </form>
            )}

            {/* ── RESET ── */}
            {mode === 'reset' && (
              <form onSubmit={handleReset} noValidate>
                <div style={{ ...fieldWrap, position: 'relative' }}>
                  <div style={{ position: 'relative' }}>
                    <i className="fa-solid fa-envelope" style={{ ...iconStyle, color: '#0ea5e9' }} />
                    <input
                      type="email"
                      placeholder=" "
                      value={resetEmail}
                      onChange={e => setResetEmail(e.target.value)}
                      className="auth-input"
                      style={{
                        ...inputBase,
                        ...(errors.email ? { border: '2px solid #f43f5e', boxShadow: '0 0 0 4px rgba(244,63,94,0.1)' } : {}),
                        borderRadius: 12,
                        padding: '14px 12px 14px 42px',
                        fontSize: '0.9rem',
                        border: '2px solid #e2e8f0',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                      autoComplete="email"
                    />
                    <label className="floating-label" style={{
                      position: 'absolute',
                      left: 42,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: '0.9rem',
                      color: '#94a3b8',
                      pointerEvents: 'none',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      fontWeight: 500
                    }}>Email Address</label>
                  </div>
                  {errors.email && <div style={{ fontSize: '0.75rem', color: '#f43f5e', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <i className="fa-solid fa-circle-exclamation" />
                    {errors.email}
                  </div>}
                </div>

                <button type="submit" disabled={loading} className="submit-btn"
                  style={{ 
                    width: '100%', 
                    padding: '14px 0', 
                    background: 'linear-gradient(135deg, #0c4a6e, #0369a1)', 
                    color: '#fff', 
                    border: 'none', 
                    borderRadius: 12, 
                    fontSize: '0.95rem', 
                    fontWeight: 700, 
                    cursor: loading ? 'not-allowed' : 'pointer', 
                    fontFamily: "'DM Sans', sans-serif", 
                    marginTop: 8, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: 10, 
                    opacity: loading ? 0.7 : 1,
                    boxShadow: '0 4px 12px rgba(12,74,110,0.3)'
                  }}>
                  {loading && <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite' }} />}
                  {loading ? 'Sending…' : 'Send Reset Link'}
                  {!loading && <i className="fa-solid fa-paper-plane" style={{ fontSize: '0.85rem' }} />}
                </button>

                <div style={{ textAlign: 'center', marginTop: 20 }}>
                  <button type="button" onClick={() => setMode('login')}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: '#0369a1', 
                      fontSize: '0.85rem', 
                      fontWeight: 600, 
                      cursor: 'pointer', 
                      fontFamily: "'DM Sans', sans-serif",
                      padding: '8px 16px',
                      borderRadius: 8,
                      transition: 'all 0.2s',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                    onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                    <i className="fa-solid fa-arrow-left" style={{ fontSize: '0.75rem' }} />
                    Back to Sign In
                  </button>
                </div>
              </form>
            )}

            <div style={{ textAlign: 'center', marginTop: 24, fontSize: '0.72rem', color: '#94a3b8', fontFamily: "'DM Mono', monospace" }}>
              NBSAP Monitoring System · Rwanda · 2025–2030
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

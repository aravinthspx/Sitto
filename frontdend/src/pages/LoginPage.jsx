import { useState, useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useNavigate } from '../hooks/useNavigate';
import { useAuth } from '../hooks/useAuth';
import { signup, resetPassword } from '../services/authService';
import { Button } from '../components/common/Button';
import { SITTOIcon } from '../components/common/SITTOLogo';
import { LegalLinks } from '../legal/LegalLinks';
import { Link } from 'react-router-dom';
import { 
  Eye, 
  EyeOff, 
  Shield, 
  GraduationCap, 
  Loader2, 
  Mail, 
  Lock, 
  User, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight 
} from 'lucide-react';

export function LoginPage() {
  const { login, logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Page the user was sent here from (e.g. tapping a phone notification)
  const from = location.state?.from;
  const returnTo = (role) => {
    const path = from ? `${from.pathname}${from.search || ''}` : null;
    if (role === 'admin') return path?.startsWith('/admin') ? path : '/admin';
    return path && !path.startsWith('/admin') ? path : '/';
  };

  // Role: 'student' | 'admin'
  const [role, setRole] = useState('student');
  
  // Modes: 'login' | 'signup' | 'forgot'
  const [mode, setMode] = useState('login');

  // Form Fields
  const [email, setEmail] = useState(() => localStorage.getItem('remembered_email') || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(!!localStorage.getItem('remembered_email'));

  // Feedback & Validation States
  const [emailError, setEmailError] = useState('');
  const [capsLock, setCapsLock] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const modeTimer = useRef(null);
  useEffect(() => () => clearTimeout(modeTimer.current), []);

  const switchMode = (next) => {
    clearTimeout(modeTimer.current);
    setMode(next);
    setError('');
    setSuccessMsg('');
  };

  const isEmailValid = (val) => /^\S+@\S+\.\S+$/.test(val);

  const handleEmailBlur = () => {
    if (!email) setEmailError('Email is required');
    else if (!isEmailValid(email)) setEmailError('Invalid email format');
    else setEmailError('');
  };

  const handleRoleSwitch = (newRole) => {
    if (newRole !== role) {
      setRole(newRole);
      setError('');
      setSuccessMsg('');
      if (newRole === 'admin' && mode === 'signup') {
        setMode('login'); // Admin self-signup is disabled
      }
    }
  };

  const handleKeyUp = (e) => {
    if (e.getModifierState && e.getModifierState('CapsLock')) {
      setCapsLock(true);
    } else {
      setCapsLock(false);
    }
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 450);
  };

  const isValidLogin = email && isEmailValid(email) && password;
  const passwordStrongEnough = password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
  const isValidSignup = email && isEmailValid(email) && passwordStrongEnough && password === confirmPassword && name.trim() && acceptedPrivacy;
  const isValidForgot = email && isEmailValid(email);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (!isValidSignup) return;
        const res = await signup({ email, password, name, acceptedPrivacy });
        setSuccessMsg(res.message || 'Signup successful. Check your email to verify your account.');
        modeTimer.current = setTimeout(() => setMode('login'), 3000);
      } else if (mode === 'forgot') {
        if (!isValidForgot) return;
        const res = await resetPassword(email);
        setSuccessMsg(res.message || 'If your email is registered, a reset link has been sent.');
      } else {
        if (!isValidLogin) return;
        const res = await login({ username: email, password });

        if (rememberEmail) {
          localStorage.setItem('remembered_email', email);
        } else {
          localStorage.removeItem('remembered_email');
        }

        const userRole = res.user?.role || 'student';

        if (role === 'admin' && userRole !== 'admin') {
          await logout();
          setError("This account doesn't have admin access. Use the Student tab instead.");
          triggerShake();
          return;
        }

        if (role === 'student' && userRole === 'admin') {
          await logout();
          setError('This is a staff account. Use the Admin / Staff tab to sign in.');
          triggerShake();
          return;
        }

        navigate(returnTo(userRole), { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  // Already signed in (e.g. back button or bookmarked /login) — skip the form
  if (user && !loading) {
    return <Navigate to={returnTo(user.role)} replace />;
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr]">

      {/* Editorial brand panel (large screens) */}
      <aside className="liquid-dark relative hidden lg:flex flex-col justify-between overflow-hidden m-3 rounded-[28px] p-12 text-white">
        <div className="flex items-center gap-3">
          <SITTOIcon className="w-11 h-11 ring-1 ring-white/15" alt="" />
          <span className="font-heading font-bold text-xl tracking-tight">SITTO</span>
          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-[#D7FF3A] text-[#15140F]">Space Hub</span>
        </div>
        <div>
          <p className="inline-flex items-center gap-2 text-[11px] font-mono text-[#D7FF3A] mb-6">
            <span className="live-dot" /> Live seat availability
          </p>
          <h1 className="font-heading font-extrabold">
            Find a seat<br />before the <span className="hero-mark">bell.</span>
          </h1>
          <p className="mt-6 max-w-md text-white/60 text-lg leading-relaxed">
            Book library desks and lab workstations, check in with a QR pass, and get a nudge on your phone before your slot starts.
          </p>
        </div>
        <dl className="grid grid-cols-3 gap-6 border-t border-white/10 pt-6 font-mono text-xs text-white/50">
          <div><dt>Booking</dt><dd className="mt-1 font-heading text-2xl text-white">08–17h</dd></div>
          <div><dt>Check-in</dt><dd className="mt-1 font-heading text-2xl text-white">15 min</dd></div>
          <div><dt>Max slot</dt><dd className="mt-1 font-heading text-2xl text-white">3 hrs</dd></div>
        </dl>
      </aside>

      <div className="flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-[440px] relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center justify-center text-center mb-7 lg:items-start lg:text-left">
          <SITTOIcon className="w-16 h-16 sm:w-[72px] sm:h-[72px] mb-4 lg:hidden" alt="SITTO" />
          <h1 className="text-[34px] leading-none font-heading font-bold tracking-[-0.04em] text-[#15140F]">SITTO</h1>
          <p className="mt-2 text-[12px] font-mono text-[#6E6A60]">
            Smart Campus Seating · SRM KTR
          </p>
        </div>

        {/* Login Card */}
        <div className={`transition-transform duration-300 ${shake ? 'animate-shake' : ''}`}>
          <div className="glass-panel w-full overflow-hidden rounded-3xl">
            
            {/* Student / Admin Tabs */}
            <div className="p-4 sm:p-5 pb-0">
              <div
                className="ios-segmented"
                role="tablist"
                aria-label="Account type"
                style={{ '--segments': 2, '--index': role === 'admin' ? 1 : 0 }}
              >
                <span className="ios-segmented-thumb" aria-hidden="true" />
                <button
                  type="button"
                  role="tab"
                  aria-selected={role === 'student'}
                  onClick={() => handleRoleSwitch('student')}
                  className={`py-2 text-[13px] font-semibold rounded-[9px] flex items-center justify-center gap-1.5 focus:outline-none ${
                    role === 'student' ? 'text-[#15140F]' : 'text-[#45423A]'
                  }`}
                >
                  <GraduationCap className="w-4 h-4 text-[#2E4BFF]" />
                  <span>Student</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={role === 'admin'}
                  onClick={() => handleRoleSwitch('admin')}
                  className={`py-2 text-[13px] font-semibold rounded-[9px] flex items-center justify-center gap-1.5 focus:outline-none ${
                    role === 'admin' ? 'text-[#15140F]' : 'text-[#45423A]'
                  }`}
                >
                  <Shield className="w-4 h-4 text-[#2E4BFF]" />
                  <span>Admin / Staff</span>
                </button>
              </div>
            </div>

            {/* Sub-Header */}
            <div className="px-6 pt-4 pb-2 text-center">
              <h2 className="text-xl font-bold font-heading text-[#15140F]">
                {mode === 'signup'
                  ? 'Create Student Account'
                  : mode === 'forgot'
                  ? 'Reset Your Password'
                  : role === 'admin'
                  ? 'Staff Sign In'
                  : 'Welcome Back'}
              </h2>
              <p className="text-xs sm:text-sm text-[#45423A] mt-1">
                {mode === 'signup'
                  ? 'Register with your institutional email to book campus seats.'
                  : mode === 'forgot'
                  ? 'Enter your registered email to receive a password recovery link.'
                  : role === 'admin'
                  ? 'Access live floor occupancy, desk allocations and admin tools.'
                  : 'Sign in to reserve your study desk or lab workstation.'}
              </p>
            </div>

            <div className="p-6 pt-3">
              {/* Success Message Banner */}
              {successMsg && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/70 text-emerald-800 text-xs sm:text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Error Message Banner */}
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-50/70 border border-red-200/70 text-red-800 text-xs sm:text-sm font-medium flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Authentication Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Full Name (Sign Up only) */}
                {mode === 'signup' && (
                  <div>
                    <label htmlFor="name-input" className="block text-xs font-semibold text-gray-700 mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        id="name-input"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoComplete="name"
                        maxLength={100}
                        placeholder="e.g. Maya Sharma"
                        required
                        className="w-full h-11 pl-10 pr-4 rounded-xl glass-input text-[#15140F] placeholder-[#6E6A60] text-sm focus:border-[#2E4BFF] focus:ring-2 focus:ring-[#2E4BFF]/20 outline-none transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* Email Input */}
                <div>
                  <label htmlFor="email-input" className="block text-xs font-semibold text-gray-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="email-input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onBlur={handleEmailBlur}
                      placeholder={role === 'admin' ? 'staff@srmist.edu.in' : 'you@srmist.edu.in'}
                      autoComplete="email"
                      required
                      className="w-full h-11 pl-10 pr-4 rounded-xl glass-input text-[#15140F] placeholder-[#6E6A60] text-sm focus:border-[#2E4BFF] focus:ring-2 focus:ring-[#2E4BFF]/20 outline-none transition-all"
                    />
                  </div>
                  {emailError && (
                    <p className="text-xs font-medium text-red-500 mt-1 ml-1 flex items-center gap-1">
                      <span>{emailError}</span>
                    </p>
                  )}
                </div>

                {/* Password Input (Login & Signup modes) */}
                {mode !== 'forgot' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor="password-input" className="text-xs font-semibold text-gray-700">
                        Password
                      </label>
                      {mode === 'login' && (
                        <button
                          type="button"
                          onClick={() => switchMode('forgot')}
                          className="text-xs font-medium text-[#2E4BFF] hover:text-[#1F37E0] transition-colors focus:outline-none"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="password-input"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyUp={handleKeyUp}
                        autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                        placeholder="••••••••"
                        required
                        className="w-full h-11 pl-10 pr-11 rounded-xl glass-input text-[#15140F] placeholder-[#6E6A60] text-sm focus:border-[#2E4BFF] focus:ring-2 focus:ring-[#2E4BFF]/20 outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-700 transition-colors focus:outline-none"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {mode === 'signup' && password && !passwordStrongEnough && (
                      <p className="text-xs font-medium text-[#45423A] mt-1 ml-1">
                        Use at least 8 characters with letters and numbers.
                      </p>
                    )}
                    {capsLock && (
                      <p className="text-xs font-medium text-amber-600 mt-1 ml-1">
                        ⚠️ Caps Lock is on
                      </p>
                    )}
                  </div>
                )}

                {/* Confirm Password (Signup only) */}
                {mode === 'signup' && (
                  <div>
                    <label htmlFor="confirm-password-input" className="block text-xs font-semibold text-gray-700 mb-1">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="confirm-password-input"
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        placeholder="••••••••"
                        required
                        className="w-full h-11 pl-10 pr-4 rounded-xl glass-input text-[#15140F] placeholder-[#6E6A60] text-sm focus:border-[#2E4BFF] focus:ring-2 focus:ring-[#2E4BFF]/20 outline-none transition-all"
                      />
                    </div>
                  </div>
                )}

                {mode === 'signup' && confirmPassword && password !== confirmPassword && (
                  <p className="text-xs font-medium text-red-500 -mt-2 ml-1">Passwords do not match</p>
                )}

                {/* Privacy consent (Signup only) */}
                {mode === 'signup' && (
                  <div className="flex items-start gap-2 pt-0.5">
                    <input
                      id="privacy-checkbox"
                      type="checkbox"
                      checked={acceptedPrivacy}
                      onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                      required
                      className="mt-0.5 w-4 h-4 rounded border-gray-300 cursor-pointer accent-[#2E4BFF]"
                    />
                    <label htmlFor="privacy-checkbox" className="text-xs font-medium text-gray-600 cursor-pointer">
                      I have read the{' '}
                      <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#2E4BFF] underline">Privacy Policy</Link>{' '}
                      and agree to SITTO processing my data as described there.
                    </label>
                  </div>
                )}

                {/* Remember Email Checkbox (Login mode) */}
                {mode === 'login' && (
                  <div className="flex items-center gap-2 pt-0.5">
                    <input
                      id="remember-checkbox"
                      type="checkbox"
                      checked={rememberEmail}
                      onChange={(e) => setRememberEmail(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-[#2E4BFF] focus:ring-[#2E4BFF] cursor-pointer accent-[#2E4BFF]"
                    />
                    <label htmlFor="remember-checkbox" className="text-xs font-medium text-gray-600 cursor-pointer hover:text-[#15140F] transition-colors">
                      Remember email on this device
                    </label>
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={
                    (mode === 'login' && !isValidLogin) ||
                    (mode === 'signup' && !isValidSignup) ||
                    (mode === 'forgot' && !isValidForgot) ||
                    loading
                  }
                  className="w-full h-12 mt-2 rounded-xl text-white bg-[#15140F] hover:bg-[#24231C] font-semibold text-sm transition-all btn-press disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <span>
                        {mode === 'login'
                          ? 'Sign in to SITTO'
                          : mode === 'signup'
                          ? 'Create Account'
                          : 'Send Recovery Link'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </form>

              {/* Mode Switching Links */}
              <div className="mt-4 pt-3 border-t border-[#E6E1D6] text-center">
                {mode === 'login' ? (
                  role === 'student' && (
                    <p className="text-xs text-gray-500">
                      New to SITTO?{' '}
                      <button
                        type="button"
                        onClick={() => switchMode('signup')}
                        className="font-semibold text-[#2E4BFF] hover:underline focus:outline-none"
                      >
                        Create Student Account
                      </button>
                    </p>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="text-xs font-semibold text-[#2E4BFF] hover:underline focus:outline-none"
                  >
                    ← Back to Sign In
                  </button>
                )}
              </div>

            </div>
          </div>
        </div>

        <LegalLinks className="mt-5 justify-center" />
      </div>
      </div>
    </div>
  );
}

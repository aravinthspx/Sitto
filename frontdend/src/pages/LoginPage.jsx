import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { signup, resetPassword } from '../services/authService';
import { USE_MOCK } from '../services/config';
import { Button } from '../components/common/Button';
import { Card, CardContent } from '../components/common/Card';
import SITTOLogo from '../components/common/SITTOLogo';
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
  const { login } = useAuth();
  const navigate = useNavigate();

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
  const [rememberEmail, setRememberEmail] = useState(!!localStorage.getItem('remembered_email'));

  // Feedback & Validation States
  const [emailError, setEmailError] = useState('');
  const [capsLock, setCapsLock] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

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
  const isValidSignup = email && isEmailValid(email) && password.length >= 6 && password === confirmPassword && name;
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
        const res = await signup({ email, password, name });
        setSuccessMsg(res.message || 'Signup successful. Check your email to verify your account.');
        setTimeout(() => setMode('login'), 3000);
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
          setError("This account doesn't have admin access.");
          triggerShake();
          setLoading(false);
          return;
        }

        if (role === 'student' && userRole === 'admin') {
          setError("Please use the Admin tab to sign in.");
          triggerShake();
          setLoading(false);
          return;
        }

        // Direct normal navigation without artificial delays
        if (userRole === 'admin') {
          navigate('/admin');
        } else {
          navigate('/');
        }
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const handleMockLogin = (mockRole) => {
    if (mockRole === 'admin') {
      setEmail('admin@sitto.edu');
      setPassword('admin123');
      handleRoleSwitch('admin');
    } else {
      setEmail('student@sitto.edu');
      setPassword('student123');
      handleRoleSwitch('student');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F6F5FB] px-4 py-8 relative">
      {/* Subtle Purple & Lavender Ambient Background Accents */}
      <div className="absolute top-0 inset-x-0 h-72 bg-gradient-to-b from-[#17143A] to-transparent pointer-events-none opacity-95" />
      <div className="absolute top-12 left-1/2 -translate-x-1/2 w-[540px] h-[320px] bg-[#6B3DF5] rounded-full blur-[120px] opacity-25 pointer-events-none" />

      <div className="w-full max-w-[440px] relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center justify-center text-center mb-6">
          <div className="bg-white/95 backdrop-blur-md px-6 py-3 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-white/40 mb-3 flex items-center justify-center transition-transform duration-200 hover:scale-[1.01]">
            <SITTOLogo
              variant="full"
              size="lg"
              className="w-full"
              imgClassName="max-h-14 sm:max-h-16"
              alt="SITTO - Smart Campus Seating, SRM KTR Campus"
            />
          </div>
          <p className="text-xs sm:text-sm text-purple-200/90 font-medium tracking-wide">
            Smart Campus Seating & Occupancy • SRM KTR
          </p>
        </div>

        {/* Login Card */}
        <div className={`transition-transform duration-300 ${shake ? 'animate-shake' : ''}`}>
          <Card className="w-full bg-white border border-gray-100 shadow-[0_12px_40px_rgba(23,20,58,0.12)] overflow-hidden rounded-2xl">
            
            {/* Student / Admin Tabs */}
            <div className="p-4 sm:p-5 pb-0">
              <div className="relative flex bg-[#F1EFFB] rounded-xl p-1" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={role === 'student'}
                  onClick={() => handleRoleSwitch('student')}
                  className={`relative flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 focus:outline-none ${
                    role === 'student'
                      ? 'bg-white text-[#0F0D26] shadow-sm'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <GraduationCap className="w-4 h-4 text-[#6B3DF5]" />
                  <span>Student</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={role === 'admin'}
                  onClick={() => handleRoleSwitch('admin')}
                  className={`relative flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 focus:outline-none ${
                    role === 'admin'
                      ? 'bg-white text-[#0F0D26] shadow-sm'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  <Shield className="w-4 h-4 text-[#6B3DF5]" />
                  <span>Admin / Staff</span>
                </button>
              </div>
            </div>

            {/* Sub-Header */}
            <div className="px-6 pt-4 pb-2 text-center">
              <h2 className="text-xl font-bold font-heading text-[#0F0D26]">
                {mode === 'signup'
                  ? 'Create Student Account'
                  : mode === 'forgot'
                  ? 'Reset Your Password'
                  : role === 'admin'
                  ? 'Staff Sign In'
                  : 'Welcome Back'}
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                {mode === 'signup'
                  ? 'Register with your institutional email to book campus seats.'
                  : mode === 'forgot'
                  ? 'Enter your registered email to receive a password recovery link.'
                  : role === 'admin'
                  ? 'Access live floor occupancy, desk allocations and admin tools.'
                  : 'Sign in to reserve your study desk or lab workstation.'}
              </p>
            </div>

            <CardContent className="p-6 pt-3">
              {/* Success Message Banner */}
              {successMsg && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Error Message Banner */}
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm font-medium flex items-start gap-2">
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
                        placeholder="e.g. Maya Sharma"
                        required
                        className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 bg-white text-[#0F0D26] placeholder-gray-400 text-sm focus:border-[#6B3DF5] focus:ring-2 focus:ring-[#6B3DF5]/20 outline-none transition-all"
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
                      placeholder={role === 'admin' ? 'admin@srmist.edu.in' : 'student@srmist.edu.in'}
                      required
                      className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 bg-white text-[#0F0D26] placeholder-gray-400 text-sm focus:border-[#6B3DF5] focus:ring-2 focus:ring-[#6B3DF5]/20 outline-none transition-all"
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
                          onClick={() => { setMode('forgot'); setError(''); setSuccessMsg(''); }}
                          className="text-xs font-medium text-[#6B3DF5] hover:text-[#5a32d6] transition-colors focus:outline-none"
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
                        placeholder="••••••••"
                        required
                        className="w-full h-11 pl-10 pr-11 rounded-xl border border-gray-200 bg-white text-[#0F0D26] placeholder-gray-400 text-sm focus:border-[#6B3DF5] focus:ring-2 focus:ring-[#6B3DF5]/20 outline-none transition-all"
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
                        placeholder="••••••••"
                        required
                        className="w-full h-11 pl-10 pr-4 rounded-xl border border-gray-200 bg-white text-[#0F0D26] placeholder-gray-400 text-sm focus:border-[#6B3DF5] focus:ring-2 focus:ring-[#6B3DF5]/20 outline-none transition-all"
                      />
                    </div>
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
                      className="w-4 h-4 rounded border-gray-300 text-[#6B3DF5] focus:ring-[#6B3DF5] cursor-pointer accent-[#6B3DF5]"
                    />
                    <label htmlFor="remember-checkbox" className="text-xs font-medium text-gray-600 cursor-pointer hover:text-[#0F0D26] transition-colors">
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
                  className="w-full h-11 mt-2 rounded-xl text-white bg-[#6B3DF5] hover:bg-[#5a32d6] font-semibold text-sm transition-all shadow-sm hover:shadow btn-press disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
              <div className="mt-4 pt-3 border-t border-gray-100 text-center">
                {mode === 'login' ? (
                  role === 'student' && (
                    <p className="text-xs text-gray-500">
                      New to SITTO?{' '}
                      <button
                        type="button"
                        onClick={() => { setMode('signup'); setError(''); setSuccessMsg(''); }}
                        className="font-semibold text-[#6B3DF5] hover:underline focus:outline-none"
                      >
                        Create Student Account
                      </button>
                    </p>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
                    className="text-xs font-semibold text-[#6B3DF5] hover:underline focus:outline-none"
                  >
                    ← Back to Sign In
                  </button>
                )}
              </div>

              {/* Quick Demo Credentials (Mock Mode Only) */}
              {USE_MOCK && mode === 'login' && (
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <p className="text-[10px] text-center text-gray-400 mb-2 uppercase tracking-wider font-bold">
                    Demo Quick-Fill
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs h-8 rounded-lg border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-[#0F0D26]"
                      onClick={() => handleMockLogin('student')}
                    >
                      Student Demo
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs h-8 rounded-lg border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-[#0F0D26]"
                      onClick={() => handleMockLogin('admin')}
                    >
                      Admin Demo
                    </Button>
                  </div>
                </div>
              )}

            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

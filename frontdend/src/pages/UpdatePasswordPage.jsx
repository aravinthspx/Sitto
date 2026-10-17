import { useState, useEffect } from 'react';
import { useNavigate } from '../hooks/useNavigate';
import { updatePassword } from '../services/authService';
import { Button } from '../components/common/Button';
import { Card, CardContent } from '../components/common/Card';
import SITTOLogo from '../components/common/SITTOLogo';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export function UpdatePasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Extract hash tokens on mount
  const [tokens, setTokens] = useState({ access_token: '', refresh_token: '' });
  
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const access_token = params.get('access_token');
      const refresh_token = params.get('refresh_token');
      if (access_token && refresh_token) {
        setTokens({ access_token, refresh_token });
        // Remove the tokens from the address bar and browser history straight away
        window.history.replaceState(null, '', window.location.pathname);
      } else {
        setError('Invalid or expired reset link. Please try again.');
      }
    } else {
      setError('No reset tokens found in the URL. Please use the link from your email.');
    }
  }, []);

  const isValid = password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password) && password === confirmPassword && tokens.access_token;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid || loading) return;

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await updatePassword(password, tokens.access_token, tokens.refresh_token);
      setSuccess('Your password has been updated successfully!');
      setTimeout(() => {
        // Clear hash from URL and navigate to login
        window.history.replaceState(null, '', window.location.pathname);
        navigate('/login');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      
      <div className="w-full max-w-md z-10">
        <Card className="w-full overflow-hidden rounded-3xl">
          <div className="px-6 py-5 bg-transparent text-[#0F0D26] border-b border-white/50">
            <div className="flex flex-col items-center justify-center space-y-3 mb-1.5">
              <SITTOLogo variant="full" size="md" className="py-1" alt="SITTO Logo" />
              <h2 className="text-xl font-bold font-heading tracking-tight text-center">Set New Password</h2>
            </div>
          </div>
          
          <CardContent className="p-6">
            {success ? (
              <div className="p-4 bg-green-50 text-green-800 rounded-xl text-center font-medium">
                {success}
                <div className="mt-2 text-sm">Redirecting to sign in...</div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="peer w-full h-14 px-4 pt-5 pb-1 rounded-xl glass-input text-[#0F0D26] placeholder-transparent focus:border-[#6B3DF5] focus:ring-1 focus:ring-[#6B3DF5] outline-none transition-all pr-12"
                    placeholder="New Password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <label htmlFor="password" className="absolute left-4 top-2 text-xs font-medium text-gray-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:font-normal peer-placeholder-shown:text-gray-400 peer-focus:top-2 peer-focus:text-xs peer-focus:font-medium peer-focus:text-[#6B3DF5] cursor-text">
                    New Password (8+ chars, letters & numbers)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-4 p-1 text-gray-400 hover:text-gray-600 focus:outline-none focus:text-[#6B3DF5] transition-colors rounded-full hover:bg-white/60"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    className="peer w-full h-14 px-4 pt-5 pb-1 rounded-xl glass-input text-[#0F0D26] placeholder-transparent focus:border-[#6B3DF5] focus:ring-1 focus:ring-[#6B3DF5] outline-none transition-all pr-12"
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                  />
                  <label htmlFor="confirmPassword" className="absolute left-4 top-2 text-xs font-medium text-gray-500 transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:font-normal peer-placeholder-shown:text-gray-400 peer-focus:top-2 peer-focus:text-xs peer-focus:font-medium peer-focus:text-[#6B3DF5] cursor-text">
                    Confirm Password
                  </label>
                </div>

                {password && confirmPassword && password !== confirmPassword && (
                  <p className="text-xs text-red-500 ml-1">Passwords do not match</p>
                )}

                {error && (
                  <div className="p-3 bg-red-50 text-red-700 text-sm font-medium rounded-xl border border-red-100 flex items-start">
                    <span className="mr-2">⚠️</span>
                    <span>{error}</span>
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-12 mt-2 rounded-xl text-white bg-[#6B3DF5] hover:bg-[#5a32d6] font-semibold text-base transition-all shadow-sm hover:shadow disabled:opacity-70 disabled:cursor-not-allowed"
                  disabled={!isValid || loading}
                >
                  {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Updating...</> : 'Update Password'}
                </Button>
                
                <div className="text-center mt-4">
                  <button type="button" onClick={() => navigate('/login')} className="text-sm font-semibold text-gray-500 hover:text-[#6B3DF5] transition-colors">
                    Back to Sign In
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

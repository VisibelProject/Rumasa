import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Lock, Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from './lib/supabase';

interface LoginProps {
  onLogin: (username: string) => void;
}

type AuthMode = 'login' | 'signup' | 'forgot-password' | 'update-password';

export default function Login({ onLogin }: LoginProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setMessage({ 
        type: 'warning', 
        text: 'Konfigurasi Supabase belum lengkap. Pastikan VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY sudah diatur di panel Secrets (Settings > Secrets).' 
      });
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('update-password');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (!isSupabaseConfigured) {
        throw new Error('Konfigurasi Supabase belum diatur. Silakan isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di panel Secrets.');
      }

      if (mode === 'signup') {
        // Check if email exists in personal_info (employee data)
        const checkRes = await fetch(`/api/personal-info/check-email/${encodeURIComponent(email)}`);
        const { exists } = await checkRes.json();

        if (!exists) {
          throw new Error('Email tidak terdaftar mohon hubungi admin');
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Registration successful! Please check your email for verification.' });
        setMode('login');
      } else if (mode === 'login') {
        // Clear any stale session before logging in to avoid "Refresh Token Not Found" errors
        if (localStorage.getItem('supabase.auth.token')) {
          await supabase.auth.signOut();
          localStorage.removeItem('supabase.auth.token');
        }

        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          // If it's a refresh token error, clear and retry once
          if (error.message.includes('Refresh Token')) {
            localStorage.clear();
            const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
              email,
              password,
            });
            if (retryError) throw retryError;
            if (retryData.user) onLogin(retryData.user.email || 'User');
            return;
          }
          throw error;
        }
        if (data.user) {
          onLogin(data.user.email || 'User');
        }
      } else if (mode === 'forgot-password') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Password reset link sent to your email!' });
      } else if (mode === 'update-password') {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        setMessage({ type: 'success', text: 'Password updated successfully! You can now log in.' });
        setMode('login');
      }
    } catch (error: any) {
      let errorText = error.message || 'Terjadi kesalahan';
      if (errorText === 'Failed to fetch') {
        errorText = 'Gagal menghubungi server (Failed to fetch). Pastikan koneksi internet stabil dan URL Supabase sudah benar.';
      }
      setMessage({ type: 'error', text: errorText });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative p-4 font-sans overflow-hidden">
      {/* Background Layer */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#fce4cc] to-[#f7b780]" />
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ 
          backgroundImage: 'url("https://lh3.googleusercontent.com/d/198oYjXACqSBRz8Lql2Yrs8GEE0ddIgjU")',
          opacity: 0.4
        }}
      />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-[400px] bg-white/30 backdrop-blur-md rounded-[40px] p-8 shadow-2xl border border-white/20"
      >
        <div className="text-center mb-8">
          <h1 className="text-5xl font-serif italic text-[#5d2e17] mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
            RUMASA
          </h1>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-center mb-6 relative">
              {mode !== 'login' && (
                <button 
                  onClick={() => setMode('login')}
                  className="absolute left-0 p-2 text-[#5d2e17]/60 hover:text-[#5d2e17] transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
              )}
              <h2 className="text-2xl font-bold text-[#5d2e17] capitalize">
                {mode === 'login' ? 'Log in' : mode === 'signup' ? 'Sign up' : mode === 'update-password' ? 'Update Password' : 'Reset Password'}
              </h2>
            </div>

            {message && (
              <div className={`mb-6 p-4 rounded-2xl text-sm font-medium flex items-start gap-3 ${
                message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 
                message.type === 'warning' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                'bg-red-50 text-red-700 border border-red-100'
              }`}>
                {message.type === 'success' ? <CheckCircle2 size={18} className="shrink-0 mt-0.5" /> : null}
                {message.text}
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-4">
              {mode !== 'update-password' && (
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5d2e17]/40">
                    <Mail size={18} />
                  </div>
                  <input
                    type="email"
                    placeholder="Email Address"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-white/80 border-none rounded-2xl py-4 pl-12 pr-6 text-[#5d2e17] placeholder-[#5d2e17]/40 focus:ring-2 focus:ring-[#b55a2a] transition-all outline-none"
                  />
                </div>
              )}

              {mode !== 'forgot-password' && (
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5d2e17]/40">
                    <Lock size={18} />
                  </div>
                  <input
                    type="password"
                    placeholder={mode === 'update-password' ? "New Password" : "Password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/80 border-none rounded-2xl py-4 pl-12 pr-6 text-[#5d2e17] placeholder-[#5d2e17]/40 focus:ring-2 focus:ring-[#b55a2a] transition-all outline-none"
                  />
                </div>
              )}

              {mode === 'update-password' && (
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[#5d2e17]/40">
                    <Lock size={18} />
                  </div>
                  <input
                    type="password"
                    placeholder="Confirm New Password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-white/80 border-none rounded-2xl py-4 pl-12 pr-6 text-[#5d2e17] placeholder-[#5d2e17]/40 focus:ring-2 focus:ring-[#b55a2a] transition-all outline-none"
                  />
                </div>
              )}

              {mode === 'login' && (
                <div className="flex items-center justify-end px-2">
                  <button 
                    type="button" 
                    onClick={() => setMode('forgot-password')}
                    className="text-xs text-[#5d2e17]/70 font-medium hover:text-[#b55a2a] transition-colors"
                  >
                    Forgot your password?
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#b55a2a] text-white font-bold py-4 rounded-2xl shadow-lg shadow-[#b55a2a]/30 hover:bg-[#a04e24] transition-all active:scale-[0.98] mt-4 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading && <Loader2 size={20} className="animate-spin" />}
                {mode === 'login' ? 'Log in' : mode === 'signup' ? 'Create Account' : mode === 'update-password' ? 'Update Password' : 'Send Reset Link'}
              </button>
            </form>

            {mode === 'login' && (
              <div className="text-center mt-8 space-y-4">
                <p className="text-xs text-[#5d2e17]/60">
                  Don't have an account?{' '}
                  <button 
                    onClick={() => setMode('signup')}
                    className="text-[#b55a2a] font-bold hover:underline"
                  >
                    Sign up
                  </button>
                </p>
                <div className="pt-4 border-t border-[#5d2e17]/10">
                  <button 
                    onClick={async () => {
                      localStorage.clear();
                      await supabase.auth.signOut();
                      window.location.reload();
                    }}
                    className="text-[10px] text-[#5d2e17]/40 hover:text-[#5d2e17] transition-colors uppercase tracking-widest font-bold"
                  >
                    Reset Session (Jika Error Auth)
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

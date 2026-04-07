'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { register, loginWithGoogle } from '@/lib/auth';
import { signInWithGoogle } from '@/lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import Image from 'next/image';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      await register(name, email, password);
      const urlParams = new URLSearchParams(window.location.search);
      router.push(urlParams.get('redirect') || '/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      const idToken = await result.user.getIdToken();
      await loginWithGoogle(idToken);
      const urlParams = new URLSearchParams(window.location.search);
      router.push(urlParams.get('redirect') || '/dashboard');
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Google Sign-Up failed');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FE] dark:bg-[#0B0E14] flex flex-col items-center justify-center p-4 relative overflow-hidden transition-colors duration-500">
      {/* Lively Style Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#E0E7FF] dark:bg-[#1E1B4B]/20 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-normal animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#F3F0FF] dark:bg-[#2E1065]/10 blur-[100px] rounded-full" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-[360px] relative z-10"
      >
        {/* Compact Brand Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4 group decoration-transparent">
            <Image 
              src="/teamsever_logo.png" 
              alt="Teamsever Logo" 
              width={36} 
              height={36} 
              className="rounded-[10px] shadow-lg shadow-indigo-200/50 dark:shadow-none transition-transform group-hover:scale-105" 
            />
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Teamsever
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Create account</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Start managing tasks today</p>
        </div>

        {/* Compact Lively Glass Card */}
        <div className="bg-white/60 dark:bg-white/[0.03] backdrop-blur-2xl border border-white/80 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.05)] dark:shadow-none rounded-[32px] p-7 transition-all">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 ml-1">Full name</label>
              <input
                className="w-full h-11 px-4 rounded-2xl bg-slate-100/50 dark:bg-white/[0.05] border-transparent focus:bg-white dark:focus:bg-white/[0.08] border-none focus:ring-2 focus:ring-[#7C3AED]/20 dark:focus:ring-white/10 transition-all outline-none text-sm dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600"
                placeholder="John Doe"
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 ml-1">Email</label>
              <input
                className="w-full h-11 px-4 rounded-2xl bg-slate-100/50 dark:bg-white/[0.05] border-transparent focus:bg-white dark:focus:bg-white/[0.08] border-none focus:ring-2 focus:ring-[#7C3AED]/20 dark:focus:ring-white/10 transition-all outline-none text-sm dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600"
                placeholder="email@example.com"
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 ml-1">Password</label>
              <div className="relative">
                <input
                  className="w-full h-11 px-4 pr-11 rounded-2xl bg-slate-100/50 dark:bg-white/[0.05] border-transparent focus:bg-white dark:focus:bg-white/[0.08] border-none focus:ring-2 focus:ring-[#7C3AED]/20 dark:focus:ring-white/10 transition-all outline-none text-sm dark:text-white"
                  placeholder="••••••••"
                  required
                  type={showPassword ? 'text' : 'password'}
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              className="w-full h-11 bg-slate-900 dark:bg-white dark:text-slate-950 text-white font-bold rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-none hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-4 text-sm"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>

          <div className="relative my-7">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100 dark:border-white/5"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-600">
              <span className="bg-white/0 px-3">or join with</span>
            </div>
          </div>

          <button
            onClick={handleGoogleSignup}
            disabled={googleLoading}
            className="flex items-center justify-center gap-2 w-full h-11 bg-white dark:bg-white/[0.05] border border-slate-100 dark:border-white/10 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/[0.08] transition-all active:scale-95 disabled:opacity-50"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Google</span>
              </>
            )}
          </button>
        </div>

        {/* Compact Footer */}
        <div className="mt-8 text-center space-y-6">
          <p className="text-[13px] text-slate-500 dark:text-slate-400 font-medium tracking-tight">
            Already have an account?{' '}
            <Link href="/login" className="text-[#7C3AED] dark:text-[#A78BFA] font-bold hover:opacity-80 transition-opacity decoration-transparent">
              Sign In
            </Link>
          </p>
          
          <div className="flex items-center justify-center gap-4 text-[10px] text-slate-400 dark:text-slate-600 font-bold uppercase tracking-[0.2em] pt-4">
            <span>Privacy</span>
            <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-800" />
            <span>Terms</span>
            <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-800" />
            <span>© 2026</span>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed top-4 left-4 right-4 sm:top-8 sm:left-auto sm:right-8 sm:w-auto z-[100] py-3 px-5 bg-red-500/90 dark:bg-red-500/20 backdrop-blur-md border border-red-200 dark:border-red-500/30 text-white dark:text-red-400 rounded-2xl shadow-[0_20px_40px_rgba(239,68,68,0.2)] flex items-center gap-3 sm:min-w-[300px]"
          >
            <div className="w-2 h-2 rounded-full bg-white dark:bg-red-500 animate-pulse" />
            <p className="text-sm font-bold tracking-tight">{error}</p>
            <button onClick={() => setError('')} className="ml-auto hover:opacity-50">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

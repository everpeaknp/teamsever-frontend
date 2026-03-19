'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Lock, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { resetPassword } from '@/lib/auth';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Reset token is missing. Please use the link from your email.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => router.push('/login'), 800);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FE] dark:bg-[#0B0E14] flex flex-col items-center justify-center p-4 relative overflow-hidden transition-colors duration-500">
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#E0E7FF] dark:bg-[#1E1B4B]/20 blur-[120px] rounded-full mix-blend-multiply dark:mix-blend-normal animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#F3F0FF] dark:bg-[#2E1065]/10 blur-[100px] rounded-full" />

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-[360px] relative z-10"
      >
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4 group decoration-transparent">
            <Image
              src="/teamsever_logo.png"
              alt="Teamsever Logo"
              width={36}
              height={36}
              className="rounded-[10px] shadow-lg shadow-indigo-200/50 dark:shadow-none transition-transform group-hover:scale-105"
            />
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Teamsever</span>
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {!success ? 'Reset password' : 'Password updated'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {!success ? 'Choose a new password' : 'Redirecting to login…'}
          </p>
        </div>

        <div className="bg-white/60 dark:bg-white/[0.03] backdrop-blur-2xl border border-white/80 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.05)] dark:shadow-none rounded-[32px] p-7 transition-all">
          {!success ? (
            <>
              {error && (
                <div className="mb-4 p-3 bg-red-50/80 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-2xl text-sm">
                  {error}
                </div>
              )}

              {!token && (
                <div className="mb-4 p-3 bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 rounded-2xl text-sm">
                  Reset token is missing. Please open the exact link from your email.
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 ml-1">New password</label>
                  <div className="relative">
                    <input
                      className="w-full h-11 px-4 pl-11 rounded-2xl bg-slate-100/50 dark:bg-white/[0.05] border-transparent focus:bg-white dark:focus:bg-white/[0.08] border-none focus:ring-2 focus:ring-[#7C3AED]/20 dark:focus:ring-white/10 transition-all outline-none text-sm dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600"
                      placeholder="••••••••"
                      required
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                    />
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 ml-1">Confirm password</label>
                  <input
                    className="w-full h-11 px-4 rounded-2xl bg-slate-100/50 dark:bg-white/[0.05] border-transparent focus:bg-white dark:focus:bg-white/[0.08] border-none focus:ring-2 focus:ring-[#7C3AED]/20 dark:focus:ring-white/10 transition-all outline-none text-sm dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600"
                    placeholder="••••••••"
                    required
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>

                <button
                  className="w-full h-11 bg-slate-900 dark:bg-white dark:text-slate-950 text-white font-bold rounded-2xl shadow-lg shadow-slate-200/50 dark:shadow-none hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2 text-sm"
                  type="submit"
                  disabled={loading || !token}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Resetting…</span>
                    </>
                  ) : (
                    <span>Set new password</span>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-[13px] text-slate-600 dark:text-slate-400 hover:text-[#7C3AED] dark:hover:text-[#A78BFA]"
                >
                  <ArrowLeft className="size-4" />
                  Back to log in
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center">
              <div className="inline-flex items-center justify-center size-11 bg-green-100 dark:bg-green-900/20 rounded-full mb-3">
                <CheckCircle2 className="text-green-600 dark:text-green-400 size-5" />
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                You can now sign in with your new password.
              </p>
              <div className="mt-6 flex items-center justify-center">
                <Link
                  href="/login"
                  className="h-10 px-4 rounded-2xl bg-slate-900 dark:bg-white dark:text-slate-950 text-white text-sm font-bold flex items-center justify-center hover:opacity-90 transition-all"
                >
                  Go to log in
                </Link>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

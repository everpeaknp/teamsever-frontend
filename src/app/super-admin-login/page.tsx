'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Eye, EyeOff, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import Image from 'next/image';

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
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

    try {
      const response = await api.post('/auth/login', { email, password });
      
      if (response.data.success) {
        const { token, user } = response.data;
        
        if (!user.isSuperUser) {
          setError('Access denied. Super administrators only.');
          setLoading(false);
          return;
        }
        
        localStorage.setItem('authToken', token);
        localStorage.setItem('token', token);
        localStorage.setItem('userId', user._id);
        localStorage.setItem('userName', user.name);
        localStorage.setItem('userEmail', user.email);
        localStorage.setItem('isSuperUser', 'true');
        
        toast.success('Welcome back, Super Admin!');
        router.push('/super-admin');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Invalid email or password';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
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
        {/* Compact Admin Header */}
        <div className="text-center mb-8">
          <Image 
            src="/teamsever_logo.png" 
            alt="Teamsever Super Admin" 
            width={48} 
            height={48} 
            className="mb-4 shadow-lg shadow-indigo-200/50 dark:shadow-none transition-transform group-hover:scale-105 rounded-2xl" 
          />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight">Super Admin Portal</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Authorized access only</p>
        </div>

        {/* Compact Warning Banner */}
        <div className="mb-6 p-4 bg-amber-50/80 dark:bg-amber-500/10 backdrop-blur-md border border-amber-200/50 dark:border-amber-500/20 rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-bold text-amber-900 dark:text-amber-200 uppercase tracking-widest">Restricted Access</p>
            <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-1 leading-relaxed font-medium">
              Administrative portal. All activities are logged.
            </p>
          </div>
        </div>

        {/* Compact Lively Glass Card */}
        <div className="bg-white/60 dark:bg-white/[0.03] backdrop-blur-2xl border border-white/80 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.05)] dark:shadow-none rounded-[32px] p-7 transition-all">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-slate-700 dark:text-slate-300 ml-1">Admin Email</label>
              <input
                className="w-full h-11 px-4 rounded-2xl bg-slate-100/50 dark:bg-white/[0.05] border-transparent focus:bg-white dark:focus:bg-white/[0.08] border-none focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-white/10 transition-all outline-none text-sm dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600"
                placeholder="admin@teamsever.com"
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
                  className="w-full h-11 px-4 pr-11 rounded-2xl bg-slate-100/50 dark:bg-white/[0.05] border-transparent focus:bg-white dark:focus:bg-white/[0.08] border-none focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-white/10 transition-all outline-none text-sm dark:text-white"
                  placeholder="••••••••"
                  required
                  type={showPassword ? 'text' : 'password'}
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
                  <Shield className="w-4 h-4" />
                  <span>Access Portal</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Compact Footer */}
        <div className="mt-8 text-center space-y-6">
          <p className="text-[13px] text-slate-500 dark:text-slate-400 font-medium tracking-tight">
            Regular user?{' '}
            <Link href="/login" className="text-indigo-600 dark:text-indigo-400 font-bold hover:opacity-80 transition-opacity decoration-transparent">
              Sign in here
            </Link>
          </p>
          
          <p className="text-[10px] text-slate-400 dark:text-slate-600 font-bold uppercase tracking-[0.2em] pt-4">
            Protected by enterprise-grade security
          </p>
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

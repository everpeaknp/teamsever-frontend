'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Zap, 
  Users, 
  Layout, 
  ArrowRight, 
  CheckCircle2, 
  Shield, 
  Sparkles 
} from 'lucide-react';
import Image from 'next/image';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F8F9FE] dark:bg-[#0B0E14] selection:bg-indigo-100 dark:selection:bg-indigo-900/40 transition-colors duration-500 overflow-x-hidden">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-[#E0E7FF] dark:bg-[#1E1B4B]/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-5%] w-[35%] h-[35%] bg-[#F3F0FF] dark:bg-[#2E1065]/10 blur-[100px] rounded-full" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between bg-white/40 dark:bg-white/[0.02] backdrop-blur-xl border border-white/80 dark:border-white/10 rounded-[24px] px-6 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.02)] transition-all">
          <Link href="/" className="flex items-center gap-2 group decoration-transparent">
            <Image 
              src="/teamsever_logo.png" 
              alt="Teamsever Logo" 
              width={36} 
              height={36} 
              className="rounded-[10px] shadow-lg shadow-indigo-200/50 dark:shadow-none transition-transform group-hover:scale-105" 
            />
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              Teamsever
            </span>
          </Link>
          
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors decoration-transparent">Features</Link>
            <Link href="#pricing" className="text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors decoration-transparent">Pricing</Link>
            <Link href="#about" className="text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-white transition-colors decoration-transparent">About Us</Link>
          </div>

          <div className="flex items-center gap-3">
            <Link 
              href="/login" 
              className="px-5 py-2 text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all decoration-transparent"
            >
              Sign in
            </Link>
            <Link 
              href="/register" 
              className="px-5 py-2 text-sm font-bold bg-slate-900 dark:bg-white text-white dark:text-slate-950 rounded-xl shadow-lg shadow-indigo-100 dark:shadow-none hover:opacity-90 active:scale-[0.98] transition-all decoration-transparent"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative pt-32 lg:pt-48 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 lg:gap-12 items-center">
            {/* Left Column: Content */}
            <div className="text-left space-y-8 relative z-10">
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100/50 dark:border-indigo-500/20 rounded-full"
              >
                <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                <span className="text-[11px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Trusted by over 10,000 teams</span>
              </motion.div>

              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1 }}
                className="text-5xl md:text-6xl lg:text-7xl font-black text-slate-900 dark:text-white tracking-tight leading-[1.05]"
              >
                Manage tasks with <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                  unrivaled precision.
                </span>
              </motion.h1>

              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="max-w-lg text-lg text-slate-600 dark:text-slate-400 leading-relaxed"
              >
                Teamsever brings all your tasks, teammates, and tools together. 
                Refined, minimal, and built for modern high-performance teams.
              </motion.p>

              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex flex-wrap items-center gap-4 pt-4"
              >
                <Link 
                  href="/register" 
                  className="px-8 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-950 font-bold rounded-2xl shadow-xl shadow-indigo-100/30 dark:shadow-none hover:opacity-90 active:scale-[0.98] transition-all flex items-center gap-2 decoration-transparent"
                >
                  <span>Start for free</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link 
                  href="#demo" 
                  className="px-8 py-3.5 bg-white dark:bg-white/[0.02] text-slate-700 dark:text-slate-300 font-bold rounded-2xl border border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.05] transition-all decoration-transparent"
                >
                  View demo
                </Link>
              </motion.div>
            </div>

            {/* Right Column: Product Showcase */}
            <motion.div 
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="relative lg:scale-110 xl:scale-125 origin-left"
            >
              <div className="relative rounded-[32px] p-2 bg-white/40 dark:bg-white/[0.02] backdrop-blur-2xl border border-white/80 dark:border-white/10 shadow-[0_48px_100px_-20px_rgba(0,0,0,0.08)] dark:shadow-none transition-transform hover:scale-[1.02] duration-500">
                <img 
                  src="/product-showcase.png" 
                  alt="Product Interface" 
                  className="w-full h-auto rounded-[24px]"
                />
              </div>
              
              {/* Decorative background blur behind image */}
              <div className="absolute -z-10 inset-0 translate-y-10 bg-indigo-400/20 dark:bg-indigo-500/10 blur-[100px] rounded-full" />
            </motion.div>
          </div>
        </div>
      </main>

      {/* Trust Marks */}
      <section className="py-20 border-t border-slate-100 dark:border-white/5 bg-white/20 dark:bg-black/20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
            {[
              { label: 'Uptime', value: '99.99%', icon: Shield },
              { label: 'Users', value: '1M+', icon: Users },
              { label: 'Reviews', value: '4.9/5', icon: Sparkles },
              { label: 'Response', value: '<2ms', icon: Zap }
            ].map((stat, i) => (
              <div key={i} className="text-center group">
                <div className="inline-flex items-center justify-center w-10 h-10 mb-4 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl group-hover:scale-110 transition-transform">
                  <stat.icon className="w-5 h-5" />
                </div>
                <div className="text-2xl font-black text-slate-900 dark:text-white mb-1">{stat.value}</div>
                <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid - Compact & Refined */}
      <section id="features" className="py-24 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">The Experience</h2>
            <h3 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">Everything you need, nothing you don't.</h3>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: 'Seamless Workflow',
                desc: 'A minimal interface designed to keep you in flow, not in configuration.',
                icon: Layout,
                color: 'bg-indigo-500'
              },
              {
                title: 'Instant Collaboration',
                desc: 'Real-time updates and effortless sharing for teams of all sizes.',
                icon: Users,
                color: 'bg-indigo-500'
              },
              {
                title: 'Smart Priorities',
                desc: 'AI-assisted sorting to help you focus on what actually moves the needle.',
                icon: Sparkles,
                color: 'bg-indigo-500'
              }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -5 }}
                className="p-8 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/80 dark:border-white/10 rounded-[32px] hover:shadow-2xl hover:shadow-indigo-100 transition-all dark:hover:shadow-none group"
              >
                <div className={`w-12 h-12 ${feature.color} text-white rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-200/50 dark:shadow-none group-hover:scale-110 transition-transform`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-3 tracking-tight">{feature.title}</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-[48px] blur-3xl opacity-20 dark:opacity-30 group-hover:opacity-40 transition-opacity" />
          <div className="relative bg-slate-900 dark:bg-white overflow-hidden rounded-[48px] p-12 md:p-16 text-center shadow-2xl">
            {/* Decorative background for dark mode CTA */}
            <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-[80px] dark:bg-indigo-100/50" />
            
            <div className="relative z-10 space-y-8">
              <h2 className="text-4xl md:text-5xl font-black text-white dark:text-slate-950 tracking-tight leading-[1.1]"> Ready to elevate your <br /> team management?</h2>
              <div className="flex flex-wrap items-center justify-center gap-4">
                <Link 
                  href="/register" 
                  className="px-8 py-4 bg-white dark:bg-slate-950 text-slate-900 dark:text-white font-black rounded-2xl hover:scale-105 transition-transform flex items-center gap-2 decoration-transparent"
                >
                  Join Teamsever Now
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <div className="flex items-center gap-4 text-white/60 dark:text-slate-500 text-sm font-bold uppercase tracking-widest px-4">
                  <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Free Trial</div>
                  <div className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> No CC</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-100 dark:border-white/5 transition-colors">
        <div className="max-w-6xl mx-auto px-6 text-center space-y-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Sparkles className="text-white w-4 h-4" />
            </div>
            <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white uppercase tracking-widest">
              Teamsever
            </span>
          </div>
          <div className="flex flex-wrap justify-center gap-8 text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600">
            <Link href="#" className="hover:text-indigo-600 transition-colors decoration-transparent">Product</Link>
            <Link href="#" className="hover:text-indigo-600 transition-colors decoration-transparent">Company</Link>
            <Link href="#" className="hover:text-indigo-600 transition-colors decoration-transparent">Resources</Link>
            <Link href="#" className="hover:text-indigo-600 transition-colors decoration-transparent">Twitter</Link>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-600 font-bold uppercase tracking-[0.2em]">
            © 2026 • Crafted with precision for builders
          </p>
        </div>
      </footer>
    </div>
  );
}

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Check,
  FolderKanban,
  ListChecks,
  ShieldCheck,
  BarChart3,
  MessageSquare,
  TrendingUp,
} from 'lucide-react';

const C = 'mx-auto w-full max-w-[1100px] px-5 sm:px-8';

// ─── Header ────────────────────────────────────────────────────────────────────
function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-neutral-100">
      <div className={`${C} flex h-16 items-center justify-between`}>
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/teamsever_logo.png" alt="TeamsEver" width={32} height={32} priority className="h-8 w-auto" />
          <span className="text-xl font-bold tracking-tight text-neutral-900">TeamsEver</span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          <Link href="#features" className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors">Features</Link>
          <Link href="#roles" className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors">Roles</Link>
          <Link href="/pricing" className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors">Pricing</Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/login" className="hidden sm:block text-sm text-neutral-500 hover:text-neutral-900 transition-colors">
            Sign in
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Get started <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

// ─── Hero ───────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="pt-20 pb-16 sm:pt-28 sm:pb-20">
      <div className={C}>


        {/* Headline */}
        <h1 className="max-w-3xl text-[40px] sm:text-[52px] lg:text-[64px] font-semibold leading-[1.05] tracking-[-0.02em] text-neutral-900">
          Your team,<br />
          <span className="text-neutral-400">finally organized.</span>
        </h1>

        <p className="mt-6 max-w-xl text-lg leading-[1.75] text-neutral-500">
          Teamsever gives teams one place to manage workspaces, assign tasks,
          control permissions, and see what's actually getting done.
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-4">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-5 py-3 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            Start for free <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="#features" className="text-sm font-medium text-neutral-500 hover:text-neutral-800 transition-colors">
            See how it works →
          </Link>
        </div>

        {/* Social proof line */}
        <p className="mt-10 text-sm text-neutral-400">
          Used by product teams, ops leads, and project managers.
        </p>
      </div>
    </section>
  );
}

// ─── Dashboard Preview ──────────────────────────────────────────────────────────
function DashboardPreview() {
  return (
    <section className="pb-20">
      <div className={C}>
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_2px_24px_rgba(0,0,0,0.06)]">
          {/* Window chrome */}
          <div className="flex items-center gap-1.5 border-b border-neutral-100 bg-neutral-50 px-4 py-3">
            <span className="h-2.5 w-2.5 rounded-full bg-neutral-200" />
            <span className="h-2.5 w-2.5 rounded-full bg-neutral-200" />
            <span className="h-2.5 w-2.5 rounded-full bg-neutral-200" />
            <span className="ml-3 text-xs text-neutral-400">teamsever.everacy.com/workspace</span>
          </div>

          {/* Dashboard body */}
          <div className="p-5 sm:p-6">
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-5">
              {[
                { label: 'Active tasks', value: '24', pct: '68%', color: 'bg-[#2563EB]' },
                { label: 'In review', value: '8', pct: '42%', color: 'bg-neutral-400' },
                { label: 'Completed', value: '51', pct: '86%', color: 'bg-emerald-500' },
              ].map((s) => (
                <div key={s.label} className="rounded-xl border border-neutral-100 p-3.5">
                  <p className="text-[11px] font-medium uppercase tracking-widest text-neutral-400">{s.label}</p>
                  <p className="mt-1.5 text-2xl font-semibold text-neutral-900">{s.value}</p>
                  <div className="mt-3 h-1.5 w-full rounded-full bg-neutral-100">
                    <div className={`h-1.5 rounded-full ${s.color}`} style={{ width: s.pct }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Task list */}
            <div className="rounded-xl border border-neutral-100 overflow-hidden">
              <div className="flex items-center justify-between bg-neutral-50 px-4 py-3 border-b border-neutral-100">
                <p className="text-xs font-semibold text-neutral-700">Execution board</p>
                <span className="text-xs text-neutral-400">This week</span>
              </div>
              {[
                { title: 'Landing page release', owner: 'Maya', due: 'Jun 03', tag: 'High', tagColor: 'text-red-600 bg-red-50' },
                { title: 'Permissions QA pass', owner: 'Ankit', due: 'Jun 01', tag: 'Medium', tagColor: 'text-amber-600 bg-amber-50' },
                { title: 'Client approval cycle', owner: 'Sara', due: 'Jun 02', tag: 'Low', tagColor: 'text-emerald-600 bg-emerald-50' },
              ].map((t, i, arr) => (
                <div key={t.title} className={`flex items-center justify-between px-4 py-3.5 ${i < arr.length - 1 ? 'border-b border-neutral-100' : ''}`}>
                  <div>
                    <p className="text-sm font-medium text-neutral-800">{t.title}</p>
                    <p className="text-xs text-neutral-400 mt-0.5">Owner: {t.owner} · Due: {t.due}</p>
                  </div>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${t.tagColor}`}>{t.tag}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Features ──────────────────────────────────────────────────────────────────
function Features() {
  const features = [
    {
      icon: FolderKanban,
      title: 'Workspace organization',
      desc: 'Structure work by team, client, or department. Everyone knows where things live.',
    },
    {
      icon: ListChecks,
      title: 'Task ownership',
      desc: "Every task has an owner, a due date, and a priority. No more guessing who's doing what.",
    },
    {
      icon: ShieldCheck,
      title: 'Role-based access',
      desc: 'Define who can view, manage, review, or comment. Permissions that actually work.',
    },
    {
      icon: MessageSquare,
      title: 'Contextual updates',
      desc: 'Discussions stay tied to the work they belong to, not buried in chat.',
    },
    {
      icon: BarChart3,
      title: 'Progress visibility',
      desc: "See what is moving, what's blocked, and what's done — all in one view.",
    },
    {
      icon: TrendingUp,
      title: 'Team analytics',
      desc: 'Understand delivery trends and performance without building a report from scratch.',
    },
  ];

  return (
    <section id="features" className="py-20 border-t border-neutral-100">
      <div className={C}>
        <div className="mb-12">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-900">
            Everything your team needs,<br className="hidden sm:block" /> nothing they don't.
          </h2>
          <p className="mt-4 text-neutral-500 text-base leading-relaxed max-w-xl">
            Built for real teams doing real work. Practical tools without the bloat.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-neutral-100 border border-neutral-100 rounded-2xl overflow-hidden">
          {features.map((f) => (
            <div key={f.title} className="bg-white p-6 hover:bg-neutral-50 transition-colors">
              <div className="mb-4 inline-flex rounded-lg border border-neutral-200 p-2 text-neutral-500">
                <f.icon className="h-4 w-4" />
              </div>
              <h3 className="text-[15px] font-semibold text-neutral-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-[1.7] text-neutral-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Permissions Table ──────────────────────────────────────────────────────────
function PermissionsSection() {
  const rows: [string, readonly (0 | 1)[]][] = [
    ['Invite members',  [1, 1, 0, 0, 0]],
    ['Assign tasks',    [1, 1, 1, 1, 0]],
    ['Review work',     [1, 1, 1, 0, 1]],
    ['Comment',         [1, 1, 1, 1, 1]],
    ['View reports',    [1, 1, 1, 0, 1]],
    ['Manage billing',  [1, 0, 0, 0, 0]],
  ];
  const cols = ['Admin', 'Manager', 'QA', 'Member', 'Client'];

  return (
    <section id="roles" className="py-20 border-t border-neutral-100">
      <div className={`${C} grid gap-14 lg:grid-cols-2 items-start`}>
        <div>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-900">
            Access control that doesn't get in the way.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-neutral-500">
            Set up roles for every responsibility level. People see only what they need, and can do only what they should.
          </p>
          <ul className="mt-7 space-y-3">
            {[
              'Protect sensitive workspace actions',
              'Reduce mistakes with clear role boundaries',
              'Scale operations with consistent permissions',
            ].map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-sm text-neutral-600">
                <Check className="h-4 w-4 text-[#2563EB] mt-0.5 shrink-0" />
                {b}
              </li>
            ))}
          </ul>
        </div>

        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-neutral-100 bg-neutral-50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-neutral-500">Permission</th>
                {cols.map((c) => (
                  <th key={c} className="px-3 py-3 text-center text-xs font-semibold text-neutral-500">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, values], i) => (
                <tr key={label} className={`border-b border-neutral-100 ${i === rows.length - 1 ? 'border-b-0' : ''}`}>
                  <td className="px-4 py-3.5 text-neutral-700 font-medium text-xs">{label}</td>
                  {values.map((v, idx) => (
                    <td key={idx} className="px-3 py-3.5 text-center">
                      {v ? (
                        <Check className="mx-auto h-3.5 w-3.5 text-[#2563EB]" />
                      ) : (
                        <span className="text-neutral-200">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

// ─── How It Works ───────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { n: '01', title: 'Create a workspace', desc: 'Set up a clear structure for your team, client, or project.' },
    { n: '02', title: 'Invite your team', desc: 'Bring people in and assign them roles in minutes.' },
    { n: '03', title: 'Assign the work', desc: 'Create tasks with owners, dates, and priorities.' },
    { n: '04', title: 'Track progress', desc: "See what's moving, what's blocked, and ship faster." },
  ];

  return (
    <section className="py-20 border-t border-neutral-100">
      <div className={C}>
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-900 mb-12">
          Up and running in under five minutes.
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div key={s.n} className="group">
              <p className="text-3xl font-semibold text-neutral-100 group-hover:text-neutral-200 transition-colors tabular-nums">{s.n}</p>
              <h3 className="mt-3 text-[15px] font-semibold text-neutral-900">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-[1.7] text-neutral-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA ────────────────────────────────────────────────────────────────────────
function CTA() {
  return (
    <section className="py-20 border-t border-neutral-100">
      <div className={C}>
        <div className="rounded-2xl border border-[#1e3a8a] bg-[#0f1c3f] px-8 py-14 sm:px-14 text-center">
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white">
            Bring your team together.
          </h2>
          <p className="mt-4 max-w-lg mx-auto text-base leading-relaxed text-blue-100">
            Create your first workspace, invite your team, and start managing work with clarity today.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-sm font-medium text-[#2563EB] hover:bg-blue-50 transition-colors"
            >
              Start for free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="#" className="text-sm font-medium text-blue-100 hover:text-white transition-colors">
              Contact us →
            </Link>
          </div>

        </div>
      </div>
    </section>
  );
}

// ─── Footer ─────────────────────────────────────────────────────────────────────
function Footer() {
  const cols = [
    { title: 'Product', links: ['Features', 'Roles', 'Workflow', 'Pricing'] },
    { title: 'Company', links: ['About', 'Contact', 'Careers'] },
    { title: 'Resources', links: ['Documentation', 'Help center', 'Guides'] },
  ];

  return (
    <footer className="border-t border-neutral-100 bg-white py-14">
      <div className={`${C} grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]`}>
        <div>
          <div className="flex items-center gap-2.5">
            <Image src="/teamsever_logo.png" alt="Teamsever" width={32} height={32} className="h-8 w-auto" />
            <span className="text-xl font-bold tracking-tight text-neutral-900">TeamsEver</span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-[1.7] text-neutral-400">
            Workspaces, tasks, roles, and progress — all in one place.
          </p>
        </div>
        {cols.map((col) => (
          <div key={col.title}>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-neutral-900 mb-4">{col.title}</h3>
            <ul className="space-y-2.5">
              {col.links.map((l) => (
                <li key={l}>
                  <Link href="#" className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors">{l}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className={`${C} mt-10 border-t border-neutral-100 pt-6 flex items-center justify-between`}>
        <p className="text-xs text-neutral-400">© 2026 Teamsever. All rights reserved.</p>
        <p className="text-xs text-neutral-400">Made with care.</p>
      </div>
    </footer>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────────
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (token) router.push('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen bg-white text-neutral-900 antialiased">
      <Header />
      <main>
        <Hero />
        <DashboardPreview />
        <Features />
        <PermissionsSection />
        <HowItWorks />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}

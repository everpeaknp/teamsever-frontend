'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  CheckCircle2,
  FolderKanban,
  ListChecks,
  ShieldCheck,
  TrendingUp,
  MessageSquare,
  BarChart3,
  Check,
} from 'lucide-react';

const CONTAINER = 'mx-auto w-full max-w-[1180px] px-4 sm:px-6 lg:px-8';

type BtnVariant = 'primary' | 'secondary' | 'ghost';

function Button({
  href,
  children,
  variant = 'primary',
  className = '',
}: {
  href: string;
  children: React.ReactNode;
  variant?: BtnVariant;
  className?: string;
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2';
  const styles: Record<BtnVariant, string> = {
    primary:
      'bg-[#2563EB] text-white shadow-[0_10px_24px_rgba(37,99,235,0.26)] hover:-translate-y-0.5 hover:bg-[#1D4ED8]',
    secondary:
      'border border-[#D0D5DD] bg-white text-[#101828] hover:bg-[#F8FAFC] hover:border-[#98A2B3]',
    ghost: 'text-[#475467] hover:text-[#101828]',
  };

  return (
    <Link href={href} className={`${base} ${styles[variant]} ${className}`}>
      {children}
    </Link>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-[#E4E7EC] bg-white/90 backdrop-blur-md shadow-[0_1px_0_rgba(16,24,40,0.03)]">
      <div className={`${CONTAINER} flex h-[72px] items-center justify-between`}>
        <Link href="/" className="flex items-center gap-3">
          <Image src="/teamsever_logo.png" alt="TeamsEver logo" width={168} height={42} priority className="h-9 w-auto" />
          <span className="hidden sm:inline-block text-[16px] sm:text-[18px] font-semibold text-[#101828]">TeamsEver</span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {['Product', 'Features', 'Roles', 'Pricing', 'Contact'].map((item) => (
            <Link key={item} href={item === 'Pricing' ? '/pricing' : '#'} className="text-[15px] font-medium text-[#475467] hover:text-[#101828] transition-colors">
              {item}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <Button href="/login" variant="ghost" className="hidden sm:inline-flex">Sign in</Button>
          <Button href="/register">Start free</Button>
        </div>
      </div>
    </header>
  );
}

function ProductMockup() {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute -right-12 -top-10 h-64 w-64 rounded-full bg-[#DBEAFE] blur-3xl" />
      <div className="pointer-events-none absolute -left-10 bottom-2 h-44 w-44 rounded-full bg-[#FEF7C3] blur-3xl opacity-60" />
      <div className="relative overflow-hidden rounded-[26px] border border-[#E4E7EC] bg-white p-4 shadow-[0_26px_60px_rgba(16,24,40,0.14)] sm:p-5">
        <div className="rounded-[18px] border border-[#E4E7EC] bg-[#F8FAFC] p-3 sm:p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-[#E4E7EC] bg-white p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#667085]">Active tasks</p>
              <p className="mt-1.5 text-2xl font-semibold text-[#101828]">24</p>
              <div className="mt-3 h-2 rounded-full bg-[#EEF2F6]">
                <div className="h-2 w-[68%] rounded-full bg-[#2563EB]" />
              </div>
            </div>
            <div className="rounded-xl border border-[#E4E7EC] bg-white p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#667085]">In review</p>
              <p className="mt-1.5 text-2xl font-semibold text-[#101828]">8</p>
              <div className="mt-3 h-2 rounded-full bg-[#EEF2F6]">
                <div className="h-2 w-[42%] rounded-full bg-[#0EA5E9]" />
              </div>
            </div>
            <div className="rounded-xl border border-[#E4E7EC] bg-white p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-[#667085]">Completed</p>
              <p className="mt-1.5 text-2xl font-semibold text-[#101828]">51</p>
              <div className="mt-3 h-2 rounded-full bg-[#EEF2F6]">
                <div className="h-2 w-[86%] rounded-full bg-[#22C55E]" />
              </div>
            </div>
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
            <section className="rounded-xl border border-[#E4E7EC] bg-white p-3.5">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-semibold text-[#101828]">Execution board</h4>
                <span className="rounded-md bg-[#EFF6FF] px-2 py-1 text-xs font-medium text-[#2563EB]">This week</span>
              </div>

              <div className="space-y-2.5">
                {[
                  ['Landing page release', 'Owner: Maya', 'Due: Jun 03', 'High'],
                  ['Permissions QA pass', 'Owner: Ankit', 'Due: Jun 01', 'Medium'],
                  ['Client approval cycle', 'Owner: Sara', 'Due: Jun 02', 'Low'],
                ].map(([title, owner, due, level]) => (
                  <article key={title} className="rounded-lg border border-[#E4E7EC] bg-[#FBFAF7] px-3 py-2.5">
                    <p className="text-sm font-semibold text-[#101828]">{title}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-[#667085]">
                      <span>{owner}</span>
                      <span>{due}</span>
                      <span className={`rounded px-1.5 py-0.5 ${level === 'High' ? 'bg-[#FEE4E2] text-[#B42318]' : level === 'Medium' ? 'bg-[#FFF6ED] text-[#C4320A]' : 'bg-[#ECFDF3] text-[#067647]'}`}>
                        {level}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="rounded-xl border border-[#E4E7EC] bg-white p-3.5">
              <h4 className="text-sm font-semibold text-[#101828]">Role access</h4>
              <ul className="mt-3 space-y-2">
                {[
                  ['Admin', 'Full access'],
                  ['Manager', 'Manage tasks'],
                  ['QA', 'Review only'],
                  ['Member', 'Assigned tasks'],
                ].map(([role, access]) => (
                  <li key={role} className="rounded-lg border border-[#E4E7EC] bg-[#F8FAFC] px-2.5 py-2">
                    <p className="text-xs font-semibold text-[#101828]">{role}</p>
                    <p className="mt-0.5 text-xs text-[#667085]">{access}</p>
                  </li>
                ))}
              </ul>

              <div className="mt-3 rounded-lg border border-[#E4E7EC] bg-[#EFF6FF] p-2.5 text-xs text-[#1D4ED8]">
                Roles are applied per workspace and task context.
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden py-12 sm:py-16 lg:py-20">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-10 h-64 w-64 rounded-full bg-[#EAF2FF] blur-3xl" />
        <div className="absolute right-0 top-16 h-72 w-72 rounded-full bg-[#F6EFD6] blur-3xl opacity-50" />
      </div>

      <div className={`${CONTAINER} relative grid items-center gap-10 lg:grid-cols-[1fr_1.2fr]`}>
        <div>
          <h1 className="max-w-xl text-[34px] font-semibold leading-[1.06] tracking-tight text-[#101828] sm:text-[42px] lg:text-[56px]">
            Manage team projects without losing clarity.
          </h1>
          <p className="mt-5 max-w-xl text-[17px] leading-8 text-[#475467]">
            Teamsever helps growing teams organize workspaces, assign tasks, manage permissions, and keep every update visible from one simple platform.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Button href="/register">
              Start free
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button href="#" variant="secondary">See product</Button>
          </div>

          <ul className="mt-6 grid gap-2.5 text-sm sm:grid-cols-3">
            {['No credit card required', 'Setup in minutes', 'Role-based workspace control'].map((item) => (
              <li key={item} className="flex items-center gap-2 rounded-lg border border-[#E4E7EC] bg-white px-3 py-2 text-[#344054]">
                <CheckCircle2 className="h-4 w-4 text-[#2563EB]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <ProductMockup />
      </div>
    </section>
  );
}

function ValueStrip() {
  const items = [
    { icon: FolderKanban, title: 'Workspaces', desc: 'Organize projects by team, client, or department.' },
    { icon: ListChecks, title: 'Tasks', desc: 'Assign owners, dates, and priorities.' },
    { icon: ShieldCheck, title: 'Roles', desc: 'Control who can access what.' },
    { icon: TrendingUp, title: 'Progress', desc: 'See what is moving and blocked.' },
  ];

  return (
    <section className="pb-10">
      <div className={CONTAINER}>
        <div className="grid gap-3 rounded-2xl border border-[#E4E7EC] bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <article key={item.title} className="rounded-xl border border-[#E4E7EC] bg-[#FBFAF7] p-3.5 transition-all hover:-translate-y-0.5 hover:shadow-sm">
              <div className="mb-2 inline-flex rounded-lg bg-[#EFF6FF] p-2 text-[#2563EB]"><item.icon className="h-4 w-4" /></div>
              <h3 className="text-sm font-semibold text-[#101828]">{item.title}</h3>
              <p className="mt-1 text-xs leading-6 text-[#667085]">{item.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureGrid() {
  const features = [
    {
      title: 'Workspace organization',
      desc: 'Build organized workspaces for product, operations, or client delivery with clear structure from day one.',
      icon: FolderKanban,
      large: true,
    },
    { title: 'Task ownership', desc: 'Assign work with owners, due dates, and clear priorities.', icon: ListChecks },
    { title: 'Role-based permissions', desc: 'Define who can manage, review, or comment.', icon: ShieldCheck },
    { title: 'Team updates', desc: 'Keep discussions attached to tasks and decisions.', icon: MessageSquare },
    { title: 'Progress visibility', desc: 'Track status, blockers, and completion in one place.', icon: BarChart3 },
  ];

  return (
    <section className="py-12">
      <div className={CONTAINER}>
        <div className="mb-8 max-w-3xl">
          <h2 className="text-3xl font-semibold tracking-tight text-[#101828] sm:text-4xl">Built for organized team execution.</h2>
          <p className="mt-3 text-base leading-7 text-[#475467]">Everything your team needs to plan, assign, review, and complete work with clarity.</p>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
          <article className="rounded-2xl border border-[#E4E7EC] bg-white p-6 shadow-sm">
            <div className="mb-4 inline-flex rounded-xl bg-[#EFF6FF] p-2.5 text-[#2563EB]"><FolderKanban className="h-5 w-5" /></div>
            <h3 className="text-2xl font-semibold text-[#101828]">{features[0].title}</h3>
            <p className="mt-3 text-base leading-7 text-[#475467]">{features[0].desc}</p>
            <div className="mt-5 rounded-xl border border-[#E4E7EC] bg-[#F8FAFC] p-4">
              <p className="text-sm font-medium text-[#344054]">Product • Operations • Client Projects</p>
              <p className="mt-1 text-sm text-[#667085]">Separate work by team while keeping leadership visibility across all spaces.</p>
            </div>
          </article>

          <div className="grid gap-4 sm:grid-cols-2">
            {features.slice(1).map((feature) => (
              <article key={feature.title} className="rounded-2xl border border-[#E4E7EC] bg-white p-4 shadow-sm">
                <div className="mb-3 inline-flex rounded-lg bg-[#FBFAF7] p-2 text-[#2563EB]"><feature.icon className="h-4.5 w-4.5" /></div>
                <h3 className="text-lg font-semibold text-[#101828]">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[#475467]">{feature.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function PermissionsSection() {
  const rows = [
    ['Invite members', [1, 1, 0, 0, 0]],
    ['Assign tasks', [1, 1, 1, 1, 0]],
    ['Review work', [1, 1, 1, 0, 1]],
    ['Comment', [1, 1, 1, 1, 1]],
    ['View reports', [1, 1, 1, 0, 1]],
    ['Manage billing', [1, 0, 0, 0, 0]],
  ] as const;
  const cols = ['Admin', 'Manager', 'QA', 'Member', 'Client'];

  return (
    <section className="py-12">
      <div className={`${CONTAINER} grid gap-8 lg:grid-cols-[0.95fr_1.05fr]`}>
        <div>
          <h2 className="text-3xl font-semibold tracking-tight text-[#101828] sm:text-4xl">Control access without slowing the team down.</h2>
          <p className="mt-4 text-base leading-7 text-[#475467]">Create custom roles for admins, managers, QA, clients, and members so everyone gets the right level of access.</p>
          <ul className="mt-5 space-y-2.5 text-sm text-[#344054]">
            {['Protect sensitive workspace actions', 'Reduce mistakes with clear role boundaries', 'Scale operations with consistent permissions'].map((b) => (
              <li key={b} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-[#2563EB]" />{b}</li>
            ))}
          </ul>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#E4E7EC] bg-white shadow-sm">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-[#F8FAFC]">
              <tr>
                <th className="border-b border-[#E4E7EC] px-4 py-3 text-left font-semibold text-[#344054]">Permission</th>
                {cols.map((c) => <th key={c} className="border-b border-[#E4E7EC] px-3 py-3 text-center font-semibold text-[#344054]">{c}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, values], i) => (
                <tr key={label} className={i % 2 === 0 ? 'bg-white' : 'bg-[#FCFCFD]'}>
                  <td className="border-b border-[#E4E7EC] px-4 py-3 text-[#101828]">{label}</td>
                  {values.map((v, idx) => (
                    <td key={`${label}-${idx}`} className="border-b border-[#E4E7EC] px-3 py-3 text-center">
                      {v ? <Check className="mx-auto h-4 w-4 text-[#2563EB]" /> : <span className="text-[#98A2B3]">-</span>}
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

function WorkflowSection() {
  const steps = [
    ['Create workspace', 'Set up a clear structure for teams or projects.'],
    ['Invite team', 'Bring members into the workspace in minutes.'],
    ['Assign roles', 'Define permissions for each responsibility.'],
    ['Track progress', 'Monitor execution and unblock work quickly.'],
  ];

  return (
    <section className="py-12">
      <div className={CONTAINER}>
        <h2 className="text-3xl font-semibold tracking-tight text-[#101828] sm:text-4xl">From planning to progress in one flow.</h2>
        <div className="relative mt-6 grid gap-3 md:grid-cols-4">
          <div className="absolute left-0 right-0 top-6 hidden h-px bg-[#E4E7EC] md:block" />
          {steps.map(([title, desc], idx) => (
            <article key={title} className="relative rounded-xl border border-[#E4E7EC] bg-white p-4">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#EFF6FF] text-xs font-semibold text-[#2563EB]">{idx + 1}</span>
              <h3 className="mt-2 text-base font-semibold text-[#101828]">{title}</h3>
              <p className="mt-1 text-sm text-[#475467]">{desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-14">
      <div className={CONTAINER}>
        <div className="rounded-3xl border border-[#BFDBFE] bg-[#EFF6FF] p-7 sm:p-9">
          <h2 className="text-3xl font-semibold tracking-tight text-[#101828] sm:text-4xl">Bring clarity to your team&apos;s daily work.</h2>
          <p className="mt-3 max-w-2xl text-base leading-7 text-[#475467]">Create your first workspace, invite your team, and manage projects, tasks, roles, and progress from one place.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button href="/register">Start free</Button>
            <Button href="#" variant="secondary">Contact us</Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[#E4E7EC] bg-white py-12">
      <div className={`${CONTAINER} grid gap-10 md:grid-cols-[1.2fr_1fr_1fr_1fr]`}>
        <div>
          <Image src="/teamsever_logo.png" alt="Teamsever logo" width={160} height={40} className="h-9 w-auto" />
          <p className="mt-4 max-w-xs text-sm leading-6 text-[#667085]">Teamsever helps teams manage workspaces, tasks, permissions, and progress with clarity.</p>
        </div>

        <FooterCol title="Product" links={['Features', 'Roles', 'Workflow', 'Pricing']} />
        <FooterCol title="Company" links={['About', 'Contact', 'Careers']} />
        <FooterCol title="Resources" links={['Documentation', 'Help center', 'Guides']} />
      </div>
      <div className={`${CONTAINER} mt-8 border-t border-[#E4E7EC] pt-5 text-sm text-[#667085]`}>© 2026 Teamsever. All rights reserved.</div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-[#101828]">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm text-[#475467]">
        {links.map((l) => (
          <li key={l}><Link href="#" className="hover:text-[#101828] transition-colors">{l}</Link></li>
        ))}
      </ul>
    </div>
  );
}

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    if (token) router.push('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#101828]">
      <Header />
      <main>
        <Hero />
        <ValueStrip />
        <FeatureGrid />
        <PermissionsSection />
        <WorkflowSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}

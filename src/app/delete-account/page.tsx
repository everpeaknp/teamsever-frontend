'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ShieldAlert, Clock, Trash2, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getCurrentUser } from '@/lib/auth';

const C = 'mx-auto w-full max-w-[1100px] px-5 sm:px-8';

function Header({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-neutral-100">
      <div className={`${C} flex h-16 items-center justify-between`}>
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/teamsever_logo.png" alt="TeamsEver" width={32} height={32} priority className="h-8 w-auto" />
          <span className="text-xl font-bold tracking-tight text-neutral-900">TeamsEver</span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          <Link href="/#features" className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors">Features</Link>
          <Link href="/#roles" className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors">Roles</Link>
          <Link href="/pricing" className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors">Pricing</Link>
        </nav>

        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Dashboard <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden sm:block text-sm text-neutral-500 hover:text-neutral-900 transition-colors">
                Sign in
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
              >
                Get started <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function Footer() {
  const cols = [
    { title: 'Product', links: ['Features', 'Roles', 'Workflow', 'Pricing'] },
    { title: 'Company', links: ['About', 'Contact', 'Careers'] },
    { title: 'Resources', links: ['Documentation', 'Help center', 'Guides'] },
  ];

  return (
    <footer className="border-t border-neutral-100 bg-white py-14 mt-auto">
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
        <p className="text-xs text-neutral-400">A flagship product of Everacy Tech.</p>
      </div>
    </footer>
  );
}

export default function DeleteAccountPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!getCurrentUser());
  }, []);

  return (
    <div className="min-h-screen bg-white text-neutral-900 antialiased flex flex-col">
      <Header isLoggedIn={isLoggedIn} />
      
      <main className="flex-1 py-20">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <div className="mb-12">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-neutral-900">
              Account Deletion & Data Policy
            </h1>
            <p className="mt-4 text-lg text-neutral-500">
              How we handle your data when you decide to leave.
            </p>
          </div>

          <div className="space-y-12">
            <section>
              <h2 className="text-xl font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-[#2563EB]" /> How "Soft Delete" Works
              </h2>
              <p className="text-neutral-600 leading-relaxed mb-4">
                When you choose to delete your account, TeamsEver employs a <strong>Soft Delete</strong> mechanism. 
                This means your account is immediately deactivated and hidden from all workspaces, directories, 
                and active systems. To your team and other users, it will appear as though your account has been completely removed.
              </p>
              <p className="text-neutral-600 leading-relaxed">
                However, your underlying data is retained securely in our database for a <strong>30-day grace period</strong>. 
                This allows you to recover your account if it was deleted accidentally or if you change your mind.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#2563EB]" /> The 30-Day Grace Period
              </h2>
              <div className="bg-neutral-50 rounded-xl p-6 border border-neutral-100">
                <ul className="space-y-4">
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center flex-shrink-0 text-sm font-semibold">1</span>
                    <p className="text-neutral-600 text-sm leading-relaxed"><strong>Immediate Deactivation:</strong> You lose access immediately. Active sessions are terminated.</p>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center flex-shrink-0 text-sm font-semibold">2</span>
                    <p className="text-neutral-600 text-sm leading-relaxed"><strong>Data Isolation:</strong> Your profile and data are completely isolated and inaccessible to standard application queries.</p>
                  </li>
                  <li className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-[#2563EB]/10 text-[#2563EB] flex items-center justify-center flex-shrink-0 text-sm font-semibold">3</span>
                    <p className="text-neutral-600 text-sm leading-relaxed"><strong>Recovery:</strong> During these 30 days, you can contact Support to restore your account data fully intact.</p>
                  </li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[#2563EB]" /> Permanent Purge
              </h2>
              <p className="text-neutral-600 leading-relaxed">
                Once the 30-day grace period expires, our automated systems will permanently purge your data 
                from the active databases. This includes your profile, personal settings, and direct messages. 
                Please note that tasks, comments, and project resources assigned to a workspace will remain 
                to preserve the integrity of your team's project history, but they will no longer be associated 
                with your identifiable personal information (they will show as "Deleted User").
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#2563EB]" /> How to Delete Your Account
              </h2>
              <p className="text-neutral-600 leading-relaxed mb-6">
                You can initiate the account deletion process from within your account settings, or by contacting our support team.
              </p>
              {isLoggedIn ? (
                <Link
                  href="/dashboard/settings"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                >
                  Go to Settings
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-lg bg-neutral-100 px-5 py-2.5 text-sm font-medium text-neutral-900 hover:bg-neutral-200 transition-colors"
                >
                  Sign in to manage account
                </Link>
              )}
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

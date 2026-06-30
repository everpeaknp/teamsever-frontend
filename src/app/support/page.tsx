'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Mail, MessageCircle, HelpCircle, Phone } from 'lucide-react';
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

export default function SupportPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!getCurrentUser());
  }, []);

  return (
    <div className="min-h-screen bg-white text-neutral-900 antialiased flex flex-col">
      <Header isLoggedIn={isLoggedIn} />
      
      <main className="flex-1 py-20">
        <div className="mx-auto max-w-4xl px-5 sm:px-8">
          <div className="text-center mb-16">
            <h1 className="text-3xl sm:text-5xl font-semibold tracking-tight text-neutral-900">
              How can we help you?
            </h1>
            <p className="mt-5 text-lg text-neutral-500 max-w-2xl mx-auto">
              Whether you have a question about features, pricing, need a demo, or anything else, our team is ready to answer all your questions.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-16">
            <div className="bg-neutral-50 border border-neutral-100 rounded-3xl p-8 hover:border-[#2563EB]/30 transition-colors">
              <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-neutral-100 flex items-center justify-center mb-6">
                <Mail className="w-6 h-6 text-[#2563EB]" />
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 mb-2">Email Support</h3>
              <p className="text-neutral-500 mb-6">
                Our support team is available around the clock to help you with any technical issues or billing questions.
              </p>
              <a href="mailto:support@everacy.com" className="inline-flex items-center font-medium text-[#2563EB] hover:text-blue-700 transition-colors">
                support@everacy.com <ArrowRight className="ml-2 w-4 h-4" />
              </a>
            </div>

            <div className="bg-neutral-50 border border-neutral-100 rounded-3xl p-8 hover:border-[#2563EB]/30 transition-colors">
              <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-neutral-100 flex items-center justify-center mb-6">
                <MessageCircle className="w-6 h-6 text-[#2563EB]" />
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 mb-2">Live Chat</h3>
              <p className="text-neutral-500 mb-6">
                Need a quick answer? Reach out to us via WhatsApp for instant support from our customer success team.
              </p>
              <a href="https://wa.me/9779800000000" target="_blank" rel="noopener noreferrer" className="inline-flex items-center font-medium text-[#2563EB] hover:text-blue-700 transition-colors">
                Chat on WhatsApp <ArrowRight className="ml-2 w-4 h-4" />
              </a>
            </div>
          </div>

          <div className="bg-blue-50/50 border border-[#2563EB]/10 rounded-3xl p-8 sm:p-12 text-center">
            <HelpCircle className="w-10 h-10 text-[#2563EB] mx-auto mb-6" />
            <h2 className="text-2xl font-semibold text-neutral-900 mb-4">Frequently Asked Questions</h2>
            <p className="text-neutral-600 mb-8 max-w-xl mx-auto">
              Check out our help center for quick answers to common questions about setting up workspaces, managing permissions, and billing.
            </p>
            <Link
              href="#"
              className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-6 py-3 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
            >
              Browse Help Center
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

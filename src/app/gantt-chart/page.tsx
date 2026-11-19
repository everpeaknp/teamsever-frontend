'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle2, Upload, Sparkles, Users, Download } from 'lucide-react';
import { isAuthenticated } from '@/lib/auth';
import { GanttPlanSelectionModal } from '@/components/gantt/GanttPlanSelectionModal';

const C = 'mx-auto w-full max-w-[1100px] px-5 sm:px-8';

function Header() {
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
          <Link href="/#pricing" className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors">Pricing</Link>
          <Link href="/gantt-chart" className="text-sm text-neutral-900 font-medium">Gantt Chart</Link>
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

function Footer() {
  return (
    <footer className="border-t border-neutral-100 bg-neutral-50 py-12">
      <div className={C}>
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <Image src="/teamsever_logo.png" alt="TeamsEver" width={24} height={24} className="h-6 w-auto" />
            <span className="text-base font-bold text-neutral-900">TeamsEver</span>
          </div>
          <p className="text-sm text-neutral-400">
            © {new Date().getFullYear()} TeamsEver. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

function CreateButton() {
  const [showPlanModal, setShowPlanModal] = useState(false);

  const handleClick = () => {
    // Always show plan selection modal
    setShowPlanModal(true);
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="inline-flex items-center gap-2 rounded-lg bg-[#2563EB] px-5 py-3 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
      >
        Create a new Gantt chart <ArrowRight className="h-4 w-4" />
      </button>
      
      <GanttPlanSelectionModal 
        isOpen={showPlanModal} 
        onClose={() => setShowPlanModal(false)} 
      />
    </>
  );
}

function GanttMockIllustration() {
  return (
    <div className="w-full max-w-md">
      <svg viewBox="0 0 400 250" className="w-full h-auto">
        {/* Header */}
        <rect x="0" y="0" width="400" height="30" fill="#f5f5f5" />
        <text x="10" y="20" fontSize="12" fill="#737373" fontWeight="600">Task Name</text>
        <text x="220" y="20" fontSize="12" fill="#737373" fontWeight="600">Timeline</text>
        
        {/* Tasks */}
        <g>
          {/* Task 1 */}
          <rect x="0" y="30" width="400" height="40" fill="white" stroke="#e5e5e5" />
          <text x="10" y="55" fontSize="14" fill="#262626">Planning Phase</text>
          <rect x="220" y="40" width="80" height="20" rx="4" fill="#3b82f6" />
          <rect x="220" y="40" width="56" height="20" rx="4" fill="#2563eb" />
          
          {/* Task 2 */}
          <rect x="0" y="70" width="400" height="40" fill="white" stroke="#e5e5e5" />
          <text x="10" y="95" fontSize="14" fill="#262626">Development</text>
          <rect x="260" y="80" width="100" height="20" rx="4" fill="#3b82f6" />
          <rect x="260" y="80" width="40" height="20" rx="4" fill="#2563eb" />
          
          {/* Task 3 */}
          <rect x="0" y="110" width="400" height="40" fill="white" stroke="#e5e5e5" />
          <text x="10" y="135" fontSize="14" fill="#262626">Testing</text>
          <rect x="320" y="120" width="60" height="20" rx="4" fill="#3b82f6" />
          
          {/* Milestone */}
          <rect x="0" y="150" width="400" height="40" fill="white" stroke="#e5e5e5" />
          <text x="10" y="175" fontSize="14" fill="#262626">Launch</text>
          <circle cx="355" cy="170" r="6" fill="#eab308" stroke="#ca8a04" strokeWidth="2" transform="rotate(45 355 170)" />
        </g>
        
        {/* Today line */}
        <line x1="290" y1="30" x2="290" y2="190" stroke="#ef4444" strokeWidth="2" strokeDasharray="4,4" />
        <text x="270" y="210" fontSize="10" fill="#ef4444" fontWeight="600">Today</text>
      </svg>
    </div>
  );
}

function WizardIllustration() {
  return (
    <div className="w-full max-w-md">
      <svg viewBox="0 0 400 250" className="w-full h-auto">
        {/* Upload area */}
        <rect x="50" y="30" width="150" height="180" rx="8" fill="#fafafa" stroke="#e5e5e5" strokeWidth="2" strokeDasharray="8,8" />
        <g transform="translate(125, 90)">
          <circle cx="0" cy="0" r="20" fill="#3b82f6" opacity="0.1" />
          <path d="M-6,-6 L0,-12 L6,-6 M0,-12 L0,6 M-6,8 L6,8" stroke="#3b82f6" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
        <text x="125" y="140" fontSize="12" fill="#737373" textAnchor="middle">Upload PDF</text>
        
        {/* Arrow */}
        <path d="M 215 120 L 235 120" stroke="#d4d4d4" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" />
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <polygon points="0 0, 10 3, 0 6" fill="#d4d4d4" />
          </marker>
        </defs>
        
        {/* Wizard output */}
        <rect x="250" y="30" width="130" height="180" rx="8" fill="white" stroke="#e5e5e5" strokeWidth="2" />
        <g transform="translate(260, 50)">
          <circle cx="4" cy="4" r="4" fill="#3b82f6" />
          <rect x="15" y="0" width="100" height="8" rx="4" fill="#e5e5e5" />
        </g>
        <g transform="translate(260, 75)">
          <circle cx="4" cy="4" r="4" fill="#3b82f6" />
          <rect x="15" y="0" width="80" height="8" rx="4" fill="#e5e5e5" />
        </g>
        <g transform="translate(260, 100)">
          <circle cx="4" cy="4" r="4" fill="#3b82f6" />
          <rect x="15" y="0" width="90" height="8" rx="4" fill="#e5e5e5" />
        </g>
        <g transform="translate(260, 125)">
          <circle cx="4" cy="4" r="4" fill="#eab308" />
          <rect x="15" y="0" width="60" height="8" rx="4" fill="#e5e5e5" />
        </g>
        <text x="315" y="175" fontSize="11" fill="#3b82f6" textAnchor="middle" fontWeight="600">Auto-generated</text>
      </svg>
    </div>
  );
}

export default function GanttChartLandingPage() {
  const [showPlanModal, setShowPlanModal] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="pt-20 pb-16 sm:pt-28 sm:pb-20">
          <div className={C}>
            <div className="text-center">
              <h1 className="max-w-3xl mx-auto text-[40px] sm:text-[52px] lg:text-[64px] font-semibold leading-[1.05] tracking-[-0.02em] text-neutral-900">
                Plan any project with a<br />
                <span className="text-[#2563EB]">free online Gantt chart</span>
              </h1>

              <p className="mt-6 max-w-2xl mx-auto text-lg leading-[1.75] text-neutral-500">
                Visualize your project timeline, track progress, and manage dependencies with an intuitive Gantt chart tool. No credit card required.
              </p>

              <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
                <CreateButton />
                <Link href="#how-it-works" className="text-sm font-medium text-neutral-500 hover:text-neutral-800 transition-colors">
                  See how it works →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Track Progress Section */}
        <section id="how-it-works" className="py-20 bg-neutral-50">
          <div className={C}>
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl sm:text-4xl font-semibold text-neutral-900">
                  Track project progress at a glance
                </h2>
                <p className="mt-4 text-lg text-neutral-500 leading-relaxed">
                  See your entire project timeline on one screen. Color-coded task bars show what's in progress, what's complete, and what's coming next.
                </p>
                <ul className="mt-6 space-y-3">
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-[#2563EB] mt-0.5 flex-shrink-0" />
                    <span className="text-neutral-600">
                      <strong className="text-neutral-900">Visual timeline:</strong> Organize tasks with start dates, end dates, and durations
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-[#2563EB] mt-0.5 flex-shrink-0" />
                    <span className="text-neutral-600">
                      <strong className="text-neutral-900">Milestones:</strong> Mark key deliverables and deadlines
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-[#2563EB] mt-0.5 flex-shrink-0" />
                    <span className="text-neutral-600">
                      <strong className="text-neutral-900">Progress tracking:</strong> See completion percentage for every task
                    </span>
                  </li>
                </ul>
              </div>
              <div className="flex justify-center">
                <GanttMockIllustration />
              </div>
            </div>
          </div>
        </section>

        {/* Import Section */}
        <section className="py-20">
          <div className={C}>
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="order-2 md:order-1 flex justify-center">
                <WizardIllustration />
              </div>
              <div className="order-1 md:order-2">
                <h2 className="text-3xl sm:text-4xl font-semibold text-neutral-900">
                  Plan faster with PDF import and the Wizard
                </h2>
                <p className="mt-4 text-lg text-neutral-500 leading-relaxed">
                  Don't start from scratch. Upload an existing project schedule PDF or use our intelligent Gantt Wizard to generate a complete timeline in seconds.
                </p>
                <ul className="mt-6 space-y-3">
                  <li className="flex items-start gap-3">
                    <Upload className="h-5 w-5 text-[#2563EB] mt-0.5 flex-shrink-0" />
                    <span className="text-neutral-600">
                      <strong className="text-neutral-900">PDF import:</strong> Extract tasks automatically from project documents
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-[#2563EB] mt-0.5 flex-shrink-0" />
                    <span className="text-neutral-600">
                      <strong className="text-neutral-900">Gantt Wizard:</strong> Answer a few questions and get a structured project plan
                    </span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Team Management Section */}
        <section className="py-20 bg-neutral-50">
          <div className={C}>
            <div className="text-center max-w-3xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-semibold text-neutral-900">
                Manage your team's work
              </h2>
              <p className="mt-4 text-lg text-neutral-500 leading-relaxed">
                Assign tasks to team members, track status updates, manage dependencies, and export your project plan whenever you need it.
              </p>
            </div>

            <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white rounded-xl border border-neutral-200 p-6">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="h-5 w-5 text-[#2563EB]" />
                </div>
                <h3 className="mt-4 font-semibold text-neutral-900">Task assignment</h3>
                <p className="mt-2 text-sm text-neutral-600">
                  Assign tasks to team members with a dropdown selector
                </p>
              </div>

              <div className="bg-white rounded-xl border border-neutral-200 p-6">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-[#2563EB]" />
                </div>
                <h3 className="mt-4 font-semibold text-neutral-900">Status tracking</h3>
                <p className="mt-2 text-sm text-neutral-600">
                  Mark tasks as Open, In Progress, Completed, or On Hold
                </p>
              </div>

              <div className="bg-white rounded-xl border border-neutral-200 p-6">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <ArrowRight className="h-5 w-5 text-[#2563EB]" />
                </div>
                <h3 className="mt-4 font-semibold text-neutral-900">Dependencies</h3>
                <p className="mt-2 text-sm text-neutral-600">
                  Link tasks together to show what needs to happen first
                </p>
              </div>

              <div className="bg-white rounded-xl border border-neutral-200 p-6">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Download className="h-5 w-5 text-[#2563EB]" />
                </div>
                <h3 className="mt-4 font-semibold text-neutral-900">Export to CSV</h3>
                <p className="mt-2 text-sm text-neutral-600">
                  Download your project data for reporting and analysis
                </p>
              </div>
            </div>

            <div className="mt-12 text-center">
              <CreateButton />
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="py-16 sm:py-20 bg-gradient-to-br from-[#2563EB] to-[#1d4ed8]">
          <div className={C}>
            <div className="text-center text-white">
              <h2 className="text-3xl sm:text-4xl font-semibold">
                Ready to plan your next project?
              </h2>
              <p className="mt-4 text-lg text-blue-100">
                Create your free Gantt chart in seconds. No credit card required.
              </p>
              <div className="mt-8">
                <button
                  onClick={() => setShowPlanModal(true)}
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-medium text-[#2563EB] hover:bg-blue-50 transition-colors"
                >
                  Create a new Gantt chart <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
      
      <GanttPlanSelectionModal 
        isOpen={showPlanModal} 
        onClose={() => setShowPlanModal(false)} 
      />
    </div>
  );
}

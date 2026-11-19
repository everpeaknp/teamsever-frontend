'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Check, Loader2, ArrowRight, X } from 'lucide-react';
import { api } from '@/lib/axios';
import { toast } from 'sonner';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useSubscription } from '@/hooks/useSubscription';
import { getCurrentUser } from '@/lib/auth';
import { CurrencyDisplay } from '@/components/currency/CurrencyDisplay';
import { PaymentSelectionModal } from '@/components/modals/PaymentSelectionModal';
import { Plan } from '@/types';
import { getPlanFeatureLines } from '@/lib/planFeatures';
import { PlanComparisonTable } from '@/components/pricing/PlanComparisonTable';
import { PricingPlanCards } from '@/components/pricing/PricingPlanCards';
import { PlanDetailsModal } from '@/components/modals/PlanDetailsModal';

const C = 'mx-auto w-full max-w-[1100px] px-5 sm:px-8';

// ─── Header ────────────────────────────────────────────────────────────────────
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
          <Link href="/pricing" className="text-sm text-neutral-900 font-medium">Pricing</Link>
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
        <p className="text-xs text-neutral-400">A flagship product of Everacy Tech.</p>
      </div>
    </footer>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────────
export default function PricingPage() {
  const router = useRouter();
  const { whatsappNumber, systemName } = useSystemSettings();
  const { subscription } = useSubscription();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [detailsPlan, setDetailsPlan] = useState<Plan | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  useEffect(() => {
    const user = getCurrentUser();
    setIsLoggedIn(!!user);
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await api.get('/plans');
      // Sort plans by price
      const sortedPlans = response.data.data.sort((a: Plan, b: Plan) => a.price - b.price);
      setPlans(sortedPlans);
    } catch (error) {
      toast.error('Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const handleBuyPlan = async (plan: Plan) => {
    if (!isLoggedIn) {
      toast.info('Please sign in to choose a plan');
      router.push('/login');
      return;
    }
    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  const isCurrentPlan = (planName: string) => {
    return planName.toLowerCase() === subscription?.plan?.name?.toLowerCase();
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 antialiased flex flex-col">
      <Header isLoggedIn={isLoggedIn} />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="pt-20 pb-16 sm:pt-28 sm:pb-20">
          <div className={`${C} text-center`}>
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-neutral-900">
              Simple, transparent pricing
            </h1>
            <p className="mt-5 max-w-2xl mx-auto text-lg text-neutral-500 leading-relaxed">
              Choose the plan that fits your team's needs. No hidden fees, no surprises. 
              Upgrade or downgrade at any time.
            </p>

            <div className="mt-10 flex justify-center">
              <div className="relative inline-flex items-center rounded-full border border-neutral-200 bg-neutral-50 p-1">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`relative rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                    billingCycle === 'monthly' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('annual')}
                  className={`relative rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                    billingCycle === 'annual' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  Annual <span className="ml-1 text-xs text-[#2563EB] font-bold">Save 20%</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="pb-24">
          <div className={C}>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
                <p className="mt-4 text-sm text-neutral-500">Loading plans...</p>
              </div>
            ) : (
              <PricingPlanCards
                plans={plans}
                billingCycle={billingCycle}
                onSelectPlan={handleBuyPlan}
                onViewDetails={setDetailsPlan}
                currentPlanName={subscription?.plan?.name}
                highlightPopular={true}
              />
            )}

            {/* Everything You Get, Side by Side Table */}
            {!loading && plans.length > 0 && (
              <div className="mt-20 pt-12 border-t border-neutral-100">
                <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
                  <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
                    Everything You Get, Side by Side
                  </h3>
                  <p className="text-sm text-neutral-500">
                    Compare features, storage limits, and module capabilities across every plan tier.
                  </p>
                </div>
                <PlanComparisonTable plans={plans} />
              </div>
            )}
          </div>
        </section>



      </main>

      <Footer />

      {/* Payment Selection Modal */}
      {selectedPlan && (
        <PaymentSelectionModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedPlan(null);
          }}
          plan={selectedPlan}
          whatsappNumber={whatsappNumber}
          systemName={systemName}
        />
      )}

      {/* Plan Details Modal */}
      <PlanDetailsModal
        plan={detailsPlan}
        isOpen={Boolean(detailsPlan)}
        onClose={() => setDetailsPlan(null)}
        onSelectPlan={(p) => handleBuyPlan(p)}
        isCurrent={detailsPlan ? isCurrentPlan(detailsPlan.name) : false}
      />
    </div>
  );
}

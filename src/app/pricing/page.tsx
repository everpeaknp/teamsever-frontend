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
      console.error('Failed to fetch plans:', error);
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
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
                {plans.map((plan: any, index) => {
                  const isCurrent = isCurrentPlan(plan.name);
                  const planPrice = billingCycle === 'monthly' ? plan.pricePerMemberMonthly : plan.pricePerMemberAnnual;
                  const isFree = planPrice === 0 || plan.price === 0;
                  const isPopular = !isFree && planPrice > 0 && index === 1; // Highlight the middle plan usually
                  const features = getPlanFeatureLines(plan);

                  return (
                    <div
                      key={plan._id}
                      className={`relative flex h-full flex-col rounded-3xl bg-white p-8 transition-shadow hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] ${
                        isPopular
                          ? 'border-2 border-[#2563EB] shadow-[0_8px_30px_rgb(37,99,235,0.08)]'
                          : 'border border-neutral-200'
                      }`}
                    >
                      {isPopular && (
                        <div className="absolute -top-3.5 left-0 right-0 flex justify-center">
                          <span className="rounded-full bg-[#2563EB] px-3 py-1 text-xs font-semibold text-white tracking-wide uppercase">
                            Most Popular
                          </span>
                        </div>
                      )}

                      <div className="mb-6">
                        <h3 className="text-xl font-semibold text-neutral-900">{plan.name}</h3>
                        <p className="mt-2 text-sm text-neutral-500 min-h-[40px]">{plan.description}</p>
                      </div>

                      <div className="mb-8 flex items-baseline gap-1">
                        <CurrencyDisplay 
                          amount={planPrice || 0} 
                          baseCurrency={plan.baseCurrency || 'NPR'}
                          className="text-4xl sm:text-5xl font-bold tracking-tight text-neutral-900"
                        />
                        <span className="text-sm font-medium text-neutral-500">/member/mo</span>
                      </div>

                      <div className="mb-8 space-y-4 flex-1">
                        {features.map((item, itemIndex) => {
                          const isDisabled = item.includes('Disabled');
                          return (
                            <div key={itemIndex} className="flex items-start gap-3">
                              {isDisabled ? (
                                <X className="w-4 h-4 text-neutral-300 shrink-0 mt-0.5" />
                              ) : (
                                <Check className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
                              )}
                              <span className={`text-sm leading-snug ${isDisabled ? 'text-neutral-400 line-through' : 'text-neutral-700'}`}>
                                {item}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-auto pt-6 border-t border-neutral-100">
                        {isCurrent ? (
                          <button
                            disabled
                            className="w-full rounded-xl bg-neutral-100 px-4 py-3 text-sm font-semibold text-neutral-400 cursor-not-allowed"
                          >
                            Current Plan
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBuyPlan(plan)}
                            className={`w-full rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                              isPopular
                                ? 'bg-[#2563EB] text-white hover:bg-blue-700'
                                : 'bg-neutral-900 text-white hover:bg-neutral-800'
                            }`}
                          >
                            {isFree ? 'Start for free' : 'Get started'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
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
    </div>
  );
}

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
import { PlanDetailsModal } from '@/components/modals/PlanDetailsModal';

const C = 'mx-auto w-full max-w-[1100px] px-5 sm:px-8';

// ─── Header ────────────────────────────────────────────────────────────────────
function Header({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className={`${C} flex h-16 items-center justify-between`}>
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/tasko_logo.png" alt="Tasko" width={32} height={32} priority className="h-8 w-auto" />
          <span className="title-1 text-slate-950">Tasko</span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          <Link href="/#capabilities" className="body-5 text-slate-600 transition-colors hover:text-slate-950">Capabilities</Link>
          <Link href="/#roles" className="body-5 text-slate-600 transition-colors hover:text-slate-950">For teams</Link>
          <Link href="/pricing" className="body-5 text-slate-950">Pricing</Link>
        </nav>

        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="button-sm inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-white transition-colors hover:bg-blue-800"
            >
              Dashboard <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <>
                <Link href="/login" className="body-5 hidden text-slate-600 transition-colors hover:text-slate-950 sm:block">
                Sign in
              </Link>
              <Link
                href="/register"
                className="button-sm inline-flex items-center gap-1.5 rounded-lg bg-blue-700 px-4 py-2 text-white transition-colors hover:bg-blue-800"
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
    <footer className="border-t border-slate-200 bg-white py-14">
      <div className={`${C} grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]`}>
        <div>
          <div className="flex items-center gap-2.5">
            <Image src="/tasko_logo.png" alt="Tasko" width={32} height={32} className="h-8 w-auto" />
            <span className="title-1 text-slate-950">Tasko</span>
          </div>
          <p className="body-6 mt-4 max-w-xs text-wrap-pretty text-slate-500">
            Workspaces, tasks, roles, and progress — all in one place.
          </p>
        </div>
        {cols.map((col) => (
          <div key={col.title}>
            <h3 className="caption-3 mb-4 uppercase tracking-widest text-slate-950">{col.title}</h3>
            <ul className="space-y-2.5">
              {col.links.map((l) => (
                <li key={l}>
                  <Link href="#" className="body-6 text-slate-600 transition-colors hover:text-slate-950">{l}</Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className={`${C} mt-10 flex items-center justify-between border-t border-slate-200 pt-6`}>
        <p className="caption-2 text-slate-500">© 2026 Tasko. All rights reserved.</p>
        <p className="caption-2 text-slate-500">A flagship product of Everacy Tech.</p>
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
    <div className="landing-manrope flex min-h-screen flex-col bg-[#f7f9fc] text-slate-950 antialiased">
      <Header isLoggedIn={isLoggedIn} />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="border-b border-slate-200 bg-white py-16 sm:py-24">
          <div className={`${C} text-center`}>
            <p className="caption-3 uppercase tracking-[0.16em] text-blue-700">Plans that grow with the way you work</p>
            <h1 className="heading-1 mx-auto mt-5 max-w-3xl text-wrap-balance text-slate-950">
              Choose the right workspace for your team.
            </h1>
            <p className="body-2 mx-auto mt-6 max-w-2xl text-wrap-pretty text-slate-600">
              Start with the essentials, then add the people, operations, and controls your workspace needs as it grows.
            </p>

            <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <span className="caption-2 text-slate-500">Billing cadence</span>
              <div className="relative inline-flex items-center rounded-lg border border-slate-200 bg-slate-100 p-1">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`relative rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                    billingCycle === 'monthly' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-950'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('annual')}
                  className={`relative rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                    billingCycle === 'annual' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-950'
                  }`}
                >
                  Annual <span className="ml-1 text-xs font-bold text-blue-700">Save 20%</span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="pb-24 pt-12 sm:pt-16">
          <div className={C}>
            {loading ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-20">
                <Loader2 className="h-8 w-8 animate-spin text-blue-700" />
                <p className="body-6 mt-4 text-slate-500">Loading plans...</p>
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
                      className={`relative flex h-full flex-col rounded-2xl bg-white p-7 transition-shadow hover:shadow-[0_18px_45px_rgba(15,23,42,0.09)] sm:p-8 ${
                        isPopular
                          ? 'border-2 border-blue-700 shadow-[0_18px_45px_rgba(37,99,235,0.12)]'
                          : 'border border-slate-200'
                      }`}
                    >
                      {isPopular && (
                        <div className="absolute -top-3.5 left-0 right-0 flex justify-center">
                          <span className="rounded-full bg-blue-700 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                            Most Popular
                          </span>
                        </div>
                      )}

                      <div className="mb-6">
                        <h3 className="heading-5 text-slate-950">{plan.name}</h3>
                        <p className="body-6 mt-2 min-h-[40px] text-wrap-pretty text-slate-500">{plan.description}</p>
                      </div>

                      <div className="mb-8 flex items-baseline gap-1">
                        <CurrencyDisplay 
                          amount={planPrice || 0} 
                          baseCurrency={plan.baseCurrency || 'NPR'}
                          className="text-4xl sm:text-5xl font-bold tracking-tight text-neutral-900"
                        />
                        <span className="body-6 text-slate-500">/member/mo</span>
                      </div>

                      <div className="mb-8 flex-1 space-y-3.5">
                        {features.slice(0, 8).map((item, itemIndex) => {
                          const isDisabled = item.includes('Disabled');
                          return (
                            <div key={itemIndex} className="flex items-start gap-3">
                              {isDisabled ? (
                                <X className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                              ) : (
                                <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
                              )}
                              <span className={`body-6 leading-snug ${isDisabled ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                                {item}
                              </span>
                            </div>
                          );
                        })}

                        {features.length > 8 && (
                          <div className="pt-1.5">
                            <button
                              type="button"
                              onClick={() => setDetailsPlan(plan)}
                              className="caption-3 inline-flex cursor-pointer items-center gap-1.5 py-1 text-blue-700 transition-colors hover:text-blue-800 hover:underline"
                            >
                              <span>+ View more ({features.length - 8} more features)</span>
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="mt-auto border-t border-slate-200 pt-6">
                        {isCurrent ? (
                          <button
                            disabled
                            className="button-md w-full cursor-not-allowed rounded-lg bg-slate-100 px-4 py-3 text-slate-400"
                          >
                            Current Plan
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBuyPlan(plan)}
                            className={`button-md w-full rounded-lg px-4 py-3 transition-colors ${
                              isPopular
                                ? 'bg-blue-700 text-white hover:bg-blue-800'
                                : 'bg-slate-950 text-white hover:bg-slate-800'
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

            {/* Everything You Get, Side by Side Table */}
            {!loading && plans.length > 0 && (
              <div className="mt-20 border-t border-slate-200 pt-12">
                <div className="mx-auto mb-10 max-w-2xl space-y-2 text-center">
                  <p className="caption-3 uppercase tracking-[0.16em] text-blue-700">Compare the details</p>
                  <h3 className="heading-3 text-wrap-balance text-slate-950">
                    See what changes as your workspace grows.
                  </h3>
                  <p className="body-6 text-slate-500">
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

'use client';

import { Check, X } from 'lucide-react';
import { Plan } from '@/types';
import { CurrencyDisplay } from '@/components/currency/CurrencyDisplay';
import { getPlanFeatureLines } from '@/lib/planFeatures';

interface PricingPlanCardsProps {
  plans: Plan[];
  billingCycle: 'monthly' | 'annual';
  onSelectPlan: (plan: Plan) => void;
  onViewDetails?: (plan: Plan) => void;
  currentPlanName?: string;
  highlightPopular?: boolean;
}

export function PricingPlanCards({
  plans,
  billingCycle,
  onSelectPlan,
  onViewDetails,
  currentPlanName,
  highlightPopular = true,
}: PricingPlanCardsProps) {
  const isCurrentPlan = (planName: string) => {
    return planName.toLowerCase() === currentPlanName?.toLowerCase();
  };

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
      {plans.map((plan: any, index) => {
        const isCurrent = isCurrentPlan(plan.name);
        const planPrice = billingCycle === 'monthly' ? plan.pricePerMemberMonthly : plan.pricePerMemberAnnual;
        const isFree = planPrice === 0 || plan.price === 0;
        const isPopular = highlightPopular && !isFree && planPrice > 0 && index === 1; // Highlight the middle plan usually
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

            <div className="mb-8 space-y-3.5 flex-1">
              {features.slice(0, 8).map((item, itemIndex) => {
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

              {features.length > 8 && onViewDetails && (
                <div className="pt-1.5">
                  <button
                    type="button"
                    onClick={() => onViewDetails(plan)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2563EB] hover:text-blue-700 hover:underline transition-colors cursor-pointer py-1"
                  >
                    <span>+ View more ({features.length - 8} more features)</span>
                  </button>
                </div>
              )}
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
                  onClick={() => onSelectPlan(plan)}
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
  );
}

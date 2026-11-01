"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Check, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plan } from "@/types";
import { PlanComparisonTable } from "@/components/pricing/PlanComparisonTable";
import { PlanDetailsModal } from "@/components/modals/PlanDetailsModal";
import { getPlanFeatureLines } from "@/lib/planFeatures";
import { api } from "@/lib/axios";

export function HomePricingSection() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [selectedPlanForModal, setSelectedPlanForModal] = useState<Plan | null>(null);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await api.get("/plans");
      const list = res.data?.data || [];
      // Sort plans by price
      list.sort((a: Plan, b: Plan) => (a.pricePerMemberMonthly ?? a.price) - (b.pricePerMemberMonthly ?? b.price));
      setPlans(list);
    } catch (e) {
      console.error("Failed to load plans for homepage:", e);
    } finally {
      setLoading(false);
    }
  };

  const getPlanPrice = (plan: Plan) => {
    if (billingCycle === "monthly") {
      return plan.pricePerMemberMonthly ?? plan.price ?? 0;
    }
    return plan.pricePerMemberAnnual ?? (plan.pricePerMemberMonthly ? plan.pricePerMemberMonthly * 10 : 0);
  };

  return (
    <section id="pricing" className="py-24 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-background">
      <div className="mx-auto w-full max-w-[1240px] px-5 sm:px-8 space-y-20">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <Badge variant="outline" className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#2563EB] bg-blue-50/80 border-blue-200">
            Transparent Pricing
          </Badge>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Plans built to grow with your team
          </h2>
          <p className="text-base sm:text-lg text-neutral-500 dark:text-neutral-400">
            Start free, upgrade as your team expands. Complete work management, attendance, and HR with no surprise fees.
          </p>

          {/* Billing Switcher */}
          <div className="pt-4 flex items-center justify-center">
            <div className="inline-flex items-center p-1 rounded-full bg-neutral-200/60 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={`px-5 py-2 text-xs sm:text-sm font-semibold rounded-full transition-all ${
                  billingCycle === "monthly"
                    ? "bg-white dark:bg-card text-neutral-900 dark:text-white shadow-sm"
                    : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("annual")}
                className={`px-5 py-2 text-xs sm:text-sm font-semibold rounded-full transition-all flex items-center gap-1.5 ${
                  billingCycle === "annual"
                    ? "bg-white dark:bg-card text-neutral-900 dark:text-white shadow-sm"
                    : "text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                }`}
              >
                Annual billing
                <span className="text-[11px] font-bold text-[#2563EB] bg-blue-50 dark:bg-blue-950/80 px-2 py-0.5 rounded-full">
                  Save 20%
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
            <p className="text-sm text-neutral-500">Loading plan options...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
            {plans.map((plan, index) => {
              const price = getPlanPrice(plan);
              const isFree = price === 0;
              const isPopular = index === 1; // Middle plan is typically Pro/Business
              const allFeatures = getPlanFeatureLines(plan);
              const displayedFeatures = allFeatures.slice(0, 8);
              const hasMoreFeatures = allFeatures.length > 8;
              const currency = plan.baseCurrency || "Rs.";

              return (
                <div
                  key={plan._id}
                  className={`relative flex flex-col justify-between rounded-3xl p-8 bg-white dark:bg-card transition-all duration-200 hover:shadow-xl ${
                    isPopular
                      ? "border-2 border-[#2563EB] shadow-lg shadow-blue-500/10 dark:shadow-blue-950/20"
                      : "border border-neutral-200 dark:border-neutral-800 shadow-sm"
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="bg-[#2563EB] text-white text-[11px] font-bold tracking-wider uppercase px-3 py-1 rounded-full shadow-sm">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="space-y-6">
                    {/* Header */}
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-neutral-900 dark:text-white">{plan.name}</h3>
                        {index === 0 && (
                          <Badge variant="secondary" className="text-[10px] font-semibold uppercase">
                            Starter
                          </Badge>
                        )}
                        {index >= 2 && (
                          <Badge variant="outline" className="text-[10px] font-semibold uppercase text-purple-600 border-purple-200 bg-purple-50">
                            Enterprise
                          </Badge>
                        )}
                      </div>
                      <p className="mt-2 text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2">
                        {plan.description}
                      </p>
                    </div>

                    {/* Price */}
                    <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white whitespace-nowrap">
                          {isFree ? "Free" : `${currency}\u00A0${price}`}
                        </span>
                        {!isFree && (
                          <span className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
                            /member/{billingCycle === "monthly" ? "mo" : "yr"}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-400 mt-1">
                        {isFree
                          ? "Free forever for up to 5 members"
                          : `Billed ${billingCycle === "monthly" ? "monthly" : "annually"}`}
                      </p>
                    </div>

                    {/* Features (max 8 items, 9th is View More) */}
                    <div className="space-y-3 pt-2">
                      <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                        Included in this plan:
                      </p>
                      <ul className="space-y-2.5">
                        {displayedFeatures.map((feat, fIdx) => (
                          <li key={fIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-neutral-700 dark:text-neutral-300">
                            <div className="rounded-full bg-blue-50 dark:bg-blue-950/60 p-0.5 text-[#2563EB] dark:text-blue-400 mt-0.5 shrink-0">
                              <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                            </div>
                            <span className="leading-snug">{feat}</span>
                          </li>
                        ))}

                        {/* 9th item: View More button opening modal with fixed baseline height */}
                        {hasMoreFeatures ? (
                          <li className="pt-1.5 min-h-[32px] flex items-center">
                            <button
                              type="button"
                              onClick={() => setSelectedPlanForModal(plan)}
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2563EB] hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline transition-colors cursor-pointer py-1"
                            >
                              <span>+ View more ({allFeatures.length - 8} more features)</span>
                            </button>
                          </li>
                        ) : (
                          <li className="pt-1.5 min-h-[32px]" aria-hidden="true" />
                        )}
                      </ul>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <div className="mt-auto pt-8">
                    <Button
                      asChild
                      className={`w-full h-11 text-sm font-semibold rounded-xl shadow-sm transition-all ${
                        isPopular
                          ? "bg-[#2563EB] hover:bg-blue-700 text-white"
                          : "bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100"
                      }`}
                    >
                      <Link href={isFree ? "/register" : "/plans"}>
                        {isFree ? "Start free" : isPopular ? "Start 1-month free trial" : "Talk to sales"}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Side by Side Comparison Section - ALWAYS VISIBLE, NO CLICK BUTTON */}
        <div className="pt-8 space-y-8">
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Everything You Get, Side by Side
            </h3>
            <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400">
              A comprehensive, real-time breakdown of features, storage quotas, and modules across all tiers.
            </p>
          </div>

          <div className="transition-all duration-300">
            <PlanComparisonTable plans={plans} />
          </div>
        </div>
      </div>

      {/* Plan Details Modal */}
      <PlanDetailsModal
        plan={selectedPlanForModal}
        isOpen={Boolean(selectedPlanForModal)}
        onClose={() => setSelectedPlanForModal(null)}
      />
    </section>
  );
}

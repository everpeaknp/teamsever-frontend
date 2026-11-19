'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Plan } from '@/types';
import { PricingPlanCards } from '@/components/pricing/PricingPlanCards';
import { api } from '@/lib/axios';
import { toast } from 'sonner';
import { isAuthenticated } from '@/lib/auth';

interface GanttPlanSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GanttPlanSelectionModal({ isOpen, onClose }: GanttPlanSelectionModalProps) {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  useEffect(() => {
    if (isOpen) {
      fetchPlans();
    }
  }, [isOpen]);

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

  const handleSelectPlan = (plan: Plan) => {
    const planPrice = billingCycle === 'monthly' ? plan.pricePerMemberMonthly : plan.pricePerMemberAnnual;
    const isFree = planPrice === 0 || plan.price === 0;

    // Check if user is logged in
    if (!isAuthenticated()) {
      // Redirect to sign in with return URL
      router.push(`/login?redirect=/gantt-chart/create&plan=${plan._id}`);
      onClose();
      return;
    }

    // If free plan, go straight to Gantt chart creation
    if (isFree) {
      router.push('/gantt-chart/create');
      onClose();
      return;
    }

    // For paid plans, redirect to existing checkout/upgrade flow
    // Store selected plan in sessionStorage so the create page can access it
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('selectedGanttPlan', JSON.stringify(plan));
    }
    
    // Navigate to create page
    router.push('/gantt-chart/create');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-0">
        <div className="sticky top-0 bg-white z-10 px-6 pt-6 pb-4 border-b border-neutral-100">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold text-neutral-900">
              Choose your plan
            </DialogTitle>
            <DialogDescription className="text-neutral-500 mt-2">
              Select a plan to create your Gantt chart. You can upgrade or downgrade at any time.
            </DialogDescription>
          </DialogHeader>

          {/* Billing Toggle */}
          <div className="mt-6 flex justify-center">
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

        <div className="px-6 pb-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-[#2563EB]" />
              <p className="mt-4 text-sm text-neutral-500">Loading plans...</p>
            </div>
          ) : (
            <div className="mt-6">
              <PricingPlanCards
                plans={plans}
                billingCycle={billingCycle}
                onSelectPlan={handleSelectPlan}
                highlightPopular={true}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

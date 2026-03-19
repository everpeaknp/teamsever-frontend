'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Loader2, Zap, X, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/axios';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { CurrencyDisplay } from '@/components/currency/CurrencyDisplay';
import { PaymentSelectionModal } from '@/components/modals/PaymentSelectionModal';
import { useSubscription } from '@/hooks/useSubscription';
import { Plan } from '@/types';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';


// Plans Page Loading Skeleton
function PlansSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header Skeleton */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div>
              <Skeleton className="h-9 w-64 mb-2" />
              <Skeleton className="h-5 w-96" />
            </div>
          </div>
        </div>
      </div>

      {/* Plans Grid Skeleton */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-6 animate-pulse">
              {/* Plan Header */}
              <div className="text-center mb-6">
                <Skeleton className="h-6 w-24 mx-auto mb-2" />
                <Skeleton className="h-10 w-32 mx-auto mb-2" />
                <Skeleton className="h-4 w-full" />
              </div>

              {/* Features List */}
              <div className="space-y-2 mb-6">
                {[1, 2, 3, 4, 5, 6].map((j) => (
                  <div key={j} className="flex items-start gap-2">
                    <Skeleton className="h-4 w-4 rounded flex-shrink-0 mt-0.5" />
                    <Skeleton className="h-4 flex-1" />
                  </div>
                ))}
              </div>

              {/* Action Button */}
              <Skeleton className="h-10 w-full rounded-lg" />
            </Card>
          ))}
        </div>

        {/* Footer Note Skeleton */}
        <div className="mt-12">
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export default function PlansPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { subscription } = useSubscription();
  const { whatsappNumber } = useSystemSettings();
  
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [memberCount, setMemberCount] = useState(1);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual'); // Default to annual for higher LTV
  
  const currentPlanName = searchParams.get('current') || subscription?.plan?.name;

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await api.get('/plans');
      const sortedPlans = response.data.data.sort((a: Plan, b: Plan) => a.price - b.price);
      setPlans(sortedPlans);
    } catch (error) {
      console.error('Failed to fetch plans:', error);
      toast.error('Failed to load plans');
    } finally {
      setLoading(false);
    }
  };

  const handleBuyPlan = (plan: Plan) => {
    // Validate member count
    if (memberCount < 1) {
      toast.error('Member count must be at least 1');
      return;
    }
    
    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  const handleMemberCountChange = (value: number) => {
    if (value >= 1 && value <= 1000) {
      setMemberCount(value);
    }
  };

  const incrementMemberCount = () => {
    if (memberCount < 1000) {
      setMemberCount(prev => prev + 1);
    }
  };

  const decrementMemberCount = () => {
    if (memberCount > 1) {
      setMemberCount(prev => prev - 1);
    }
  };

  const formatLimit = (value: number) => {
    return value === -1 ? 'Unlimited' : value.toString();
  };

  const isCurrentPlan = (planName: string) => {
    return planName.toLowerCase() === currentPlanName?.toLowerCase();
  };

  const getFeaturesList = (plan: Plan) => {
    const features: string[] = [];
    
    // Core Limits - Combine similar features
    features.push(`${formatLimit(plan.features.maxWorkspaces)} Workspace${plan.features.maxWorkspaces !== 1 ? 's' : ''}`);
    features.push(`${formatLimit(plan.features.maxSpaces)} Space${plan.features.maxSpaces !== 1 ? 's' : ''}, ${formatLimit(plan.features.maxLists)} List${plan.features.maxLists !== 1 ? 's' : ''}, ${formatLimit(plan.features.maxFolders)} Folder${plan.features.maxFolders !== 1 ? 's' : ''}`);
    features.push(`${formatLimit(plan.features.maxTasks)} Task${plan.features.maxTasks !== 1 ? 's' : ''}`);
    
    // Team Management
    features.push(`${formatLimit(plan.features.maxAdmins)} Admin${plan.features.maxAdmins !== 1 ? 's' : ''}`);
    
    // Custom roles if available
    if ((plan.features as any).canUseCustomRoles) {
      const maxRoles = (plan.features as any).maxCustomRoles;
      if (maxRoles !== 0) {
        features.push(`${formatLimit(maxRoles)} Custom Role${maxRoles !== 1 ? 's' : ''}`);
      }
    }
    
    // Access Control
    if (plan.features.hasAccessControl) {
      features.push(`${plan.features.accessControlTier.charAt(0).toUpperCase() + plan.features.accessControlTier.slice(1)} Access Control`);
    }
    
    // Tables feature
    if ((plan.features as any).canCreateTables) {
      const maxTables = (plan.features as any).maxTablesCount;
      if (maxTables !== 0) {
        const maxRows = (plan.features as any).maxRowsLimit;
        const maxCols = (plan.features as any).maxColumnsLimit;
        features.push(`${formatLimit(maxTables)} Table${maxTables !== 1 ? 's' : ''} (${formatLimit(maxRows)} rows, ${formatLimit(maxCols)} cols)`);
      }
    }
    
    // Communication - Combine features
    if (plan.features.hasGroupChat) {
      const messageLimit = plan.features.messageLimit === -1 ? 'Unlimited' : plan.features.messageLimit;
      features.push(`Group Chat (${messageLimit} msgs/month)`);
    }
    
    const dmLimit = (plan.features as any).maxDirectMessagesPerUser;
    if (dmLimit !== undefined && dmLimit !== 0) {
      features.push(`${formatLimit(dmLimit)} DM${dmLimit !== 1 ? 's' : ''} per user`);
    }
    
    if (plan.features.announcementCooldown === 0) {
      features.push('No Announcement Cooldown');
    } else {
      features.push(`${plan.features.announcementCooldown}h Announcement Cooldown`);
    }
    
    // Content Storage - Combine features
    const maxFiles = (plan.features as any).maxFiles;
    const maxDocs = (plan.features as any).maxDocuments;
    if (maxFiles !== undefined && maxFiles !== 0 && maxDocs !== undefined && maxDocs !== 0) {
      features.push(`${formatLimit(maxFiles)} File${maxFiles !== 1 ? 's' : ''}, ${formatLimit(maxDocs)} Document${maxDocs !== 1 ? 's' : ''} per user`);
    }
    
    return features;
  };

  if (loading) {
    return <PlansSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Choose Your Plan</h1>
              <p className="text-muted-foreground mt-1">
                Select the plan that best fits your needs. You can upgrade or downgrade anytime.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Billing Cycle Toggle */}
        <div className="mb-6 flex justify-center">
          <Tabs value={billingCycle} onValueChange={(v) => setBillingCycle(v as 'monthly' | 'annual')} className="w-full max-w-md">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
              <TabsTrigger value="annual">Annual</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Member Count Selector */}
        <div className="mb-8 flex justify-center">
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm max-w-md w-full">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold mb-1">How many team members?</h3>
              <p className="text-sm text-muted-foreground">
                Pricing scales based on your team size
              </p>
            </div>
            
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={decrementMemberCount}
                disabled={memberCount <= 1}
                className="h-12 w-12 rounded-full"
              >
                <span className="text-xl">−</span>
              </Button>
              
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={memberCount}
                  onChange={(e) => handleMemberCountChange(parseInt(e.target.value) || 1)}
                  className="w-24 h-12 text-center text-2xl font-bold border-2 border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background"
                />
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-muted-foreground whitespace-nowrap">
                  {memberCount === 1 ? 'member' : 'members'}
                </div>
              </div>
              
              <Button
                variant="outline"
                size="icon"
                onClick={incrementMemberCount}
                disabled={memberCount >= 1000}
                className="h-12 w-12 rounded-full"
              >
                <span className="text-xl">+</span>
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const isCurrent = isCurrentPlan(plan.name);
            const isFree = plan.price === 0;
            const features = getFeaturesList(plan);

            // Get active price based on billing cycle
            const activePrice = billingCycle === 'monthly' 
              ? (plan.pricePerMemberMonthly || plan.basePrice || plan.price)
              : (plan.pricePerMemberAnnual || plan.basePrice || plan.price);

            return (
              <div
                key={plan._id}
                className={`relative rounded-xl border-2 p-6 transition-all flex flex-col ${
                  isCurrent
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50 hover:shadow-lg'
                }`}
              >
                {/* Current Plan Badge */}
                {isCurrent && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                    Current Plan
                  </Badge>
                )}

                {/* Popular Badge */}
                {!isFree && plan.price < 100 && !isCurrent && (
                  <Badge className="absolute -top-3 right-4 bg-gradient-to-r from-orange-500 to-pink-500">
                    Popular
                  </Badge>
                )}

                {/* Plan Header */}
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  <div className="mb-2">
                    {/* Price per member */}
                    <div className="flex items-baseline justify-center gap-1">
                      <CurrencyDisplay 
                        amount={activePrice} 
                        baseCurrency={plan.baseCurrency || 'NPR'}
                        className="text-2xl font-bold"
                      />
                      <span className="text-sm text-muted-foreground">/member/{billingCycle === 'monthly' ? 'month' : 'year'}</span>
                    </div>
                    
                    {/* Total price */}
                    {!isFree && (
                      <div className="mt-2 pt-2 border-t border-border">
                        <div className="text-xs text-muted-foreground mb-1">Total for {memberCount} {memberCount === 1 ? 'member' : 'members'}</div>
                        <div className="flex items-baseline justify-center gap-1">
                          <CurrencyDisplay 
                            amount={activePrice * memberCount} 
                            baseCurrency={plan.baseCurrency || 'NPR'}
                            className="text-3xl font-extrabold text-primary transition-all duration-300 ease-out"
                          />
                          <span className="text-sm text-muted-foreground">/{billingCycle === 'monthly' ? 'month' : 'year'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </div>

                {/* Features List */}
                <ul className="space-y-2 mb-6 flex-grow">
                  {features.map((feature, index) => {
                    const isDisabled = feature.includes('(Disabled)') || feature.includes('Group Chat (0');
                    
                    return (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        {isDisabled ? (
                          <X className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                        ) : (
                          <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        )}
                        <span className={isDisabled ? 'text-muted-foreground line-through' : ''}>
                          {feature.replace(' (Disabled)', '')}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                {/* Action Button */}
                <div className="mt-auto">
                  {isCurrent ? (
                    <Button disabled className="w-full" variant="outline">
                      Current Plan
                    </Button>
                  ) : isFree ? (
                    <Button disabled variant="outline" className="w-full">
                      Free Plan
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleBuyPlan(plan)}
                      className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Buy Now
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Note */}
        <div className="mt-12 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-800 dark:text-blue-200 text-center">
            <strong>Note:</strong> Clicking "Buy Now" will open WhatsApp to complete your purchase. Our team will assist you with the upgrade process.
          </p>
        </div>
      </div>

      {/* Payment Selection Modal */}
      {selectedPlan && (
        <PaymentSelectionModal
          isOpen={showPaymentModal}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedPlan(null);
          }}
          plan={selectedPlan}
          memberCount={memberCount}
          billingCycle={billingCycle}
          whatsappNumber={whatsappNumber}
        />
      )}
    </div>
  );
}

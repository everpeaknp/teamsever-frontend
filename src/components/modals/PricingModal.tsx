'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, Zap, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { api } from '@/lib/axios';
import { toast } from 'sonner';
import { useSubscription } from '@/hooks/useSubscription';
import { submitEsewaPayment } from '@/lib/esewa';
import { Plan } from '@/types';


interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PricingModal({ isOpen, onClose }: PricingModalProps) {
  const router = useRouter();
  const { subscription } = useSubscription();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchPlans();
    }
  }, [isOpen]);

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

  const handleBuyPlan = async (plan: Plan) => {
    try {
      setProcessingPlanId(plan._id);

      // Initiate payment with backend
      const response = await api.post('/payment/initiate', {
        planId: plan._id
      });

      if (response.data.success) {
        const { paymentRequest, paymentUrl } = response.data.data;
        
        // Show success message and redirect to eSewa
        toast.success('Redirecting to eSewa payment gateway...');
        
        // Small delay to show the toast
        setTimeout(() => {
          submitEsewaPayment(paymentUrl, paymentRequest);
        }, 500);
      } else {
        toast.error(response.data.message || 'Failed to initiate payment');
        setProcessingPlanId(null);
      }
    } catch (error: any) {
      console.error('Payment initiation error:', error);
      
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
        router.push('/login');
      } else {
        toast.error('Failed to initiate payment. Please try again.');
      }
      
      setProcessingPlanId(null);
    }
  };

  const formatLimit = (value: number) => {
    return value === -1 ? 'Unlimited' : value.toString();
  };

  const isCurrentPlan = (planName: string) => {
    return planName.toLowerCase() === subscription?.plan?.name?.toLowerCase();
  };

  const getFeaturesList = (plan: Plan) => {
    const features = [];
    
    const limits = [];
    limits.push(`${formatLimit(plan.features.maxSpaces)} Space${plan.features.maxSpaces !== 1 ? 's' : ''}`);
    limits.push(`${formatLimit(plan.features.maxFolders)} Folder${plan.features.maxFolders !== 1 ? 's' : ''}`);
    limits.push(`${formatLimit(plan.features.maxLists)} List${plan.features.maxLists !== 1 ? 's' : ''}`);
    limits.push(`${formatLimit(plan.features.maxTasks)} Task${plan.features.maxTasks !== 1 ? 's' : ''}`);
    features.push(limits.join(', '));
    
    features.push(`${formatLimit(plan.features.maxWorkspaces)} Workspace${plan.features.maxWorkspaces !== 1 ? 's' : ''}`);
    features.push(`${formatLimit(plan.features.maxMembers)} Member${plan.features.maxMembers !== 1 ? 's' : ''}`);
    features.push(`${formatLimit(plan.features.maxAdmins)} Admin${plan.features.maxAdmins !== 1 ? 's' : ''}`);
    
    if (plan.features.hasAccessControl) {
      features.push(`${plan.features.accessControlTier.charAt(0).toUpperCase() + plan.features.accessControlTier.slice(1)} Access Control`);
    }
    
    if (plan.features.hasGroupChat) {
      const messageLimit = plan.features.messageLimit === -1 ? 'Unlimited' : plan.features.messageLimit;
      features.push(`Group Chat (${messageLimit} messages/month)`);
    }
    
    if (plan.features.announcementCooldown === 0) {
      features.push('No Announcement Cooldown');
    } else {
      features.push(`${plan.features.announcementCooldown}h Announcement Cooldown`);
    }
    
    return features;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-2xl">Pricing Plans</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[calc(90vh-120px)]">
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                  {plans.map((plan) => {
                    const isCurrent = isCurrentPlan(plan.name);
                    const isFree = plan.price === 0;
                    const isProcessing = processingPlanId === plan._id;
                    const features = getFeaturesList(plan);

                    return (
                      <div
                        key={plan._id}
                        className={`relative rounded-xl border-2 p-6 transition-all flex flex-col ${
                          isCurrent
                            ? 'border-primary shadow-lg'
                            : 'border-border hover:border-primary/50 hover:shadow-md'
                        }`}
                      >
                        {isCurrent && (
                          <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                            Current Plan
                          </Badge>
                        )}

                        {!isFree && plan.price < 100 && !isCurrent && (
                          <Badge className="absolute -top-3 right-4 bg-gradient-to-r from-orange-500 to-pink-500">
                            Popular
                          </Badge>
                        )}

                        <div className="text-center mb-6">
                          <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                          <div className="flex items-baseline justify-center gap-1 mb-2">
                            <span className="text-4xl font-extrabold">Rs {plan.price}</span>
                            <span className="text-muted-foreground">/month</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{plan.description}</p>
                        </div>

                        <ul className="space-y-3 mb-6 flex-grow">
                          {features.map((feature, index) => {
                            const isGroupChat = feature.includes('Group Chat');
                            const isChatDisabled = !plan.features.hasGroupChat;
                            
                            return (
                              <li key={index} className="flex items-start gap-2">
                                {isChatDisabled && isGroupChat ? (
                                  <X className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                                ) : (
                                  <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                                )}
                                <span className={`text-sm ${isChatDisabled && isGroupChat ? 'text-muted-foreground line-through' : ''}`}>
                                  {isChatDisabled && isGroupChat ? 'Group Chat (Disabled)' : feature}
                                </span>
                              </li>
                            );
                          })}
                        </ul>

                        <div className="mt-auto">
                          {isCurrent ? (
                            <Button disabled className="w-full" size="lg">
                              Current Plan
                            </Button>
                          ) : isFree ? (
                            <Button disabled variant="outline" className="w-full" size="lg">
                              Free Plan
                            </Button>
                          ) : (
                            <Button
                              onClick={() => handleBuyPlan(plan)}
                              disabled={isProcessing}
                              className="w-full"
                              size="lg"
                            >
                              {isProcessing ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Processing...
                                </>
                              ) : (
                                <>
                                  <Zap className="w-4 h-4 mr-2" />
                                  Get Started
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Payment Info */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Secure Payment:</strong> All payments are processed through eSewa. Test credentials: 9806800001 / Nepal@123
                  </p>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

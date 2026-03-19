'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, MessageCircle, Loader2, ArrowRight } from 'lucide-react';
import { CurrencyDisplay } from '@/components/currency/CurrencyDisplay';
import { api } from '@/lib/axios';
import { toast } from 'sonner';
import { submitEsewaPayment } from '@/lib/esewa';

interface PaymentSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: {
    _id: string;
    name: string;
    basePrice: number;
    pricePerMemberMonthly: number;
    pricePerMemberAnnual: number;
    baseCurrency: 'USD' | 'NPR';
    description: string;
  };
  memberCount: number;
  billingCycle: 'monthly' | 'annual';
  whatsappNumber: string;
}

export function PaymentSelectionModal({
  isOpen,
  onClose,
  plan,
  memberCount,
  billingCycle,
  whatsappNumber
}: PaymentSelectionModalProps) {
  const [processingEsewa, setProcessingEsewa] = useState(false);

  // Get active price based on billing cycle
  const activePrice = billingCycle === 'monthly' 
    ? (plan.pricePerMemberMonthly || plan.basePrice)
    : (plan.pricePerMemberAnnual || plan.basePrice);

  // Calculate total amount
  const totalAmount = Math.round(activePrice * memberCount);

  const handleEsewaPayment = async () => {
    try {
      setProcessingEsewa(true);

      // Call existing eSewa payment initiation with memberCount and billingCycle
      const response = await api.post('/payment/initiate', {
        planId: plan._id,
        memberCount: memberCount,
        billingCycle: billingCycle
      });

      if (response.data.success) {
        const { paymentRequest, paymentUrl } = response.data.data;
        
        toast.success('Redirecting to eSewa payment gateway...');
        
        // Small delay to show the toast
        setTimeout(() => {
          submitEsewaPayment(paymentUrl, paymentRequest);
        }, 500);
      } else {
        toast.error(response.data.message || 'Failed to initiate payment');
        setProcessingEsewa(false);
      }
    } catch (error: any) {
      console.error('Payment initiation error:', error);
      
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else if (error.response?.status === 401) {
        toast.error('Session expired. Please login again.');
      } else {
        toast.error('Failed to initiate payment. Please try again.');
      }
      
      setProcessingEsewa(false);
    }
  };

  const handleWhatsAppPayment = () => {
    const userId = localStorage.getItem('userId') || 'Unknown';
    const userName = localStorage.getItem('userName') || 'User';
    
    const billingText = billingCycle === 'monthly' ? 'month' : 'year';
    const message = `Hi, I want to upgrade to the ${plan.name} plan.\n\nUser Details:\n- Name: ${userName}\n- User ID: ${userId}\n- Billing Cycle: ${billingCycle.charAt(0).toUpperCase() + billingCycle.slice(1)}\n- Team Members: ${memberCount}\n- Total Amount: ${totalAmount} ${plan.baseCurrency}/${billingText}\n\nPlease help me with the payment process.`;
    
    const whatsappUrl = `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">Choose Payment Method</DialogTitle>
          <DialogDescription>
            Select how you'd like to pay for {plan.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Plan Summary */}
          <div className="bg-muted rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Selected Plan</span>
              <span className="font-semibold">{plan.name}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Billing Cycle</span>
              <Badge variant={billingCycle === 'annual' ? 'default' : 'secondary'}>
                {billingCycle.charAt(0).toUpperCase() + billingCycle.slice(1)}
              </Badge>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Price per member</span>
              <span className="font-semibold">
                <CurrencyDisplay
                  amount={activePrice}
                  baseCurrency={plan.baseCurrency}
                />
                <span className="text-sm font-normal text-muted-foreground">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
              </span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Team members</span>
              <span className="font-semibold">{memberCount}</span>
            </div>
            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Total Amount</span>
                <span className="text-2xl font-bold text-primary">
                  <CurrencyDisplay
                    amount={totalAmount}
                    baseCurrency={plan.baseCurrency}
                  />
                  <span className="text-sm font-normal text-muted-foreground">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Payment Options */}
          <div className="space-y-3">
            {/* eSewa Option */}
            <button
              onClick={handleEsewaPayment}
              disabled={processingEsewa}
              className="w-full p-4 border-2 border-border rounded-lg hover:border-primary hover:bg-accent transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
                  <CreditCard className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {processingEsewa ? 'Processing...' : 'Pay with eSewa'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Instant activation • Secure payment gateway
                  </div>
                </div>
                {processingEsewa ? (
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                ) : (
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                )}
              </div>
            </button>

            {/* WhatsApp Option */}
            <button
              onClick={handleWhatsAppPayment}
              disabled={processingEsewa}
              className="w-full p-4 border-2 border-border rounded-lg hover:border-green-500 hover:bg-accent transition-all text-left group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0">
                  <MessageCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-foreground group-hover:text-green-600 transition-colors">
                    Pay via WhatsApp
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Contact support • Multiple payment options
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-green-600 transition-colors" />
              </div>
            </button>
          </div>

          {/* Info Note */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <p className="text-xs text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> eSewa provides instant activation. WhatsApp payment requires manual verification and may take a few hours.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={processingEsewa}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

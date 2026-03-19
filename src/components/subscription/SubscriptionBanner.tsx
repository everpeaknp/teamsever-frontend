"use client";

import { AlertCircle, Zap, X } from "lucide-react";
import { useState } from "react";
import { useSubscription } from "@/hooks/useSubscription";

interface SubscriptionBannerProps {
  workspaceName: string;
  whatsappNumber?: string;
}

export default function SubscriptionBanner({ 
  workspaceName, 
  whatsappNumber = "+1234567890" 
}: SubscriptionBannerProps) {
  const { subscription } = useSubscription();
  const [dismissed, setDismissed] = useState(false);

  if (!subscription || dismissed) return null;

  // Show banner if trial is expiring soon (less than 7 days) or expired
  const showBanner = subscription.daysRemaining <= 7 && !subscription.isPaid;

  if (!showBanner) return null;

  const handleUpgrade = () => {
    const message = encodeURIComponent(`Hi! I want to upgrade my workspace: ${workspaceName}`);
    const whatsappUrl = `https://wa.me/${whatsappNumber.replace(/[^0-9]/g, '')}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  const isExpired = subscription.daysRemaining <= 0;

  return (
    <div className={`relative ${isExpired ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'} border-b`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className={`w-5 h-5 ${isExpired ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`} />
            <div>
              <p className={`text-sm font-medium ${isExpired ? 'text-red-900 dark:text-red-100' : 'text-amber-900 dark:text-amber-100'}`}>
                {isExpired ? (
                  'Your trial has expired'
                ) : (
                  `Your trial expires in ${subscription.daysRemaining} day${subscription.daysRemaining === 1 ? '' : 's'}`
                )}
              </p>
              <p className={`text-xs ${isExpired ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300'}`}>
                Upgrade now to continue using premium features
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleUpgrade}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-sm font-medium rounded-lg transition-all flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              Upgrade Now
            </button>
            <button
              onClick={() => setDismissed(true)}
              className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

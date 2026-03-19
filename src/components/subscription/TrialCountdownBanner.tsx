"use client";

import { Clock, Zap, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { useSystemSettings } from "@/hooks/useSystemSettings";

export default function TrialCountdownBanner() {
  const { subscription } = useSubscription();
  const { whatsappNumber } = useSystemSettings();
  const [dismissed, setDismissed] = useState(false);

  // Load dismissed state from sessionStorage on mount
  useEffect(() => {
    const isDismissed = sessionStorage.getItem("trialBannerDismissed") === "true";
    setDismissed(isDismissed);
  }, []);

  if (!subscription || dismissed) return null;

  // Only show for free/trial users who haven't paid
  if (subscription.isPaid) return null;

  const trialDaysRemaining = subscription.daysRemaining;
  const isUrgent = trialDaysRemaining <= 3;

  const handleUpgrade = () => {
    const message = encodeURIComponent(
      `Hi! I want to upgrade my account. I have ${trialDaysRemaining} day${trialDaysRemaining === 1 ? "" : "s"} left in my trial.`
    );
    const phoneNumber = whatsappNumber || "+1234567890"; // Fallback to default if not set
    const whatsappUrl = `https://wa.me/${phoneNumber.replace(/[^0-9]/g, "")}?text=${message}`;
    window.open(whatsappUrl, "_blank");
  };

  const handleDismiss = () => {
    sessionStorage.setItem("trialBannerDismissed", "true");
    setDismissed(true);
  };

  return (
    <div
      className={`relative ${
        isUrgent
          ? "bg-gradient-to-r from-red-600 to-pink-600"
          : "bg-gradient-to-r from-amber-600 to-orange-600"
      } border-b border-gray-800`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-white" />
            <div>
              <p className="text-sm font-medium text-white">
                {trialDaysRemaining > 0
                  ? `${trialDaysRemaining} day${trialDaysRemaining === 1 ? "" : "s"} left in your trial`
                  : "Your trial has expired"}
              </p>
              <p className="text-xs text-white/90">
                Upgrade now to continue using premium features
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleUpgrade}
              className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-900 text-sm font-medium rounded-lg transition-all flex items-center gap-2"
            >
              <Zap className="w-4 h-4" />
              Upgrade Now
            </button>
            <button
              onClick={handleDismiss}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Dismiss banner"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

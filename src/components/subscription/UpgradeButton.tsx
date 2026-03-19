"use client";

import { useState } from "react";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useSubscription } from "@/hooks/useSubscription";

interface UpgradeButtonProps {
  workspaceName: string;
  whatsappNumber?: string;
  className?: string;
  nextPlanName?: string;
}

export default function UpgradeButton({ 
  workspaceName, 
  whatsappNumber = "+1234567890",
  className = "",
  nextPlanName
}: UpgradeButtonProps) {
  const router = useRouter();
  const { subscription } = useSubscription();

  // Determine button text based on whether there's a next plan
  const buttonText = nextPlanName ? `Upgrade to ${nextPlanName}` : 'Upgrade to Pro';

  return (
    <Button
      onClick={() => router.push('/plans')}
      className={`w-full bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 dark:hover:bg-slate-600 border border-slate-700 dark:border-slate-600 text-white shadow-lg relative overflow-hidden ${className}`}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20 opacity-50"></div>
      <Zap className="w-4 h-4 mr-2 relative z-10" />
      <span className="relative z-10">{buttonText}</span>
    </Button>
  );
}

"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Zap, Check, X } from "lucide-react";
import { useRouter } from "next/navigation";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason: "workspace" | "member" | "access-control" | "trial-expired";
  currentCount?: number;
  maxAllowed?: number;
  workspaceName?: string;
  whatsappNumber?: string;
}

export default function UpgradeModal({
  isOpen,
  onClose,
  reason,
  currentCount,
  maxAllowed,
  workspaceName = "My Workspace",
  whatsappNumber = "+1234567890"
}: UpgradeModalProps) {
  const router = useRouter();
  
  const getModalContent = () => {
    switch (reason) {
      case "workspace":
        return {
          title: "Workspace Limit Reached",
          description: `You've reached your limit of ${maxAllowed} workspace${maxAllowed === 1 ? '' : 's'}. Upgrade to create unlimited workspaces.`,
          features: [
            "Unlimited workspaces",
            "Advanced access control",
            "Priority support",
            "Custom integrations"
          ]
        };
      case "member":
        return {
          title: "Member Limit Reached",
          description: `You've reached your limit of ${maxAllowed} member${maxAllowed === 1 ? '' : 's'}. Upgrade to invite more team members.`,
          features: [
            "Unlimited team members",
            "Advanced permissions",
            "Team analytics",
            "Priority support"
          ]
        };
      case "access-control":
        return {
          title: "Access Control Unavailable",
          description: "Advanced access control and permissions are available in Pro plans.",
          features: [
            "Custom role permissions",
            "Granular access control",
            "Audit logs",
            "Security features"
          ]
        };
      case "trial-expired":
        return {
          title: "Trial Period Expired",
          description: "Your 30-day trial has ended. Upgrade now to continue using premium features.",
          features: [
            "All premium features",
            "Unlimited workspaces",
            "Unlimited members",
            "Priority support"
          ]
        };
      default:
        return {
          title: "Upgrade Required",
          description: "Upgrade your plan to unlock this feature.",
          features: []
        };
    }
  };

  const content = getModalContent();

  const handleViewPlans = () => {
    router.push('/plans');
    onClose(); // Close the upgrade modal
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <DialogTitle className="text-xl">{content.title}</DialogTitle>
              </div>
            </div>
            <DialogDescription className="text-base">
              {content.description}
            </DialogDescription>
          </DialogHeader>

          {/* Features List */}
          {content.features.length > 0 && (
            <div className="space-y-3 my-4">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                What you'll get:
              </p>
              {content.features.map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{feature}</span>
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              Maybe Later
            </Button>
            <Button
              onClick={handleViewPlans}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
            >
              <Zap className="w-4 h-4 mr-2" />
              View Plans
            </Button>
          </div>

          {/* Contact Info */}
          <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-4">
            Choose from our available plans and upgrade via WhatsApp
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Sparkles, ArrowRight, ShieldAlert } from "lucide-react";
import { useWorkspaceEntitlements } from "@/hooks/useWorkspaceEntitlements";

interface PlanFeatureGateProps {
  workspaceId: string;
  moduleKey?: 'attendance' | 'hr' | 'payroll' | 'projects' | 'developer' | 'chat';
  featureKey?: 'canUseGanttChart' | 'canUsePhysicalTerminals' | 'canUseFieldTracking' | 'canUseDesktopTracking' | 'canCreatePrivateChannels' | 'canUseQaModule';
  featureName: string;
  description?: string;
  children: React.ReactNode;
}

export function PlanFeatureGate({
  workspaceId,
  moduleKey,
  featureKey,
  featureName,
  description,
  children
}: PlanFeatureGateProps) {
  const router = useRouter();
  const { entitlements, loading } = useWorkspaceEntitlements(workspaceId);

  if (loading) {
    return <>{children}</>;
  }

  // Check module entitlement
  let allowed = true;
  if (moduleKey && entitlements?.modules) {
    if (moduleKey === 'attendance') {
      allowed = entitlements.modules.attendance.enabled;
    } else if (moduleKey === 'hr') {
      allowed = entitlements.modules.hr.enabled;
    } else if (moduleKey === 'payroll') {
      allowed = entitlements.modules.payroll.enabled;
    } else if (moduleKey === 'developer') {
      allowed = entitlements.modules.developer.canUseGithubIntegration || entitlements.modules.developer.canUseQaModule;
    }
  }

  // Check specific feature entitlement
  if (allowed && featureKey && entitlements?.modules) {
    if (featureKey === 'canUseGanttChart') {
      allowed = entitlements.modules.projects.canUseGanttChart;
    } else if (featureKey === 'canUsePhysicalTerminals') {
      allowed = entitlements.modules.attendance.enabled && entitlements.modules.attendance.canUsePhysicalTerminals;
    } else if (featureKey === 'canUseFieldTracking') {
      allowed = entitlements.modules.tracking.canUseFieldTracking;
    } else if (featureKey === 'canUseDesktopTracking') {
      allowed = entitlements.modules.tracking.canUseDesktopTracking;
    } else if (featureKey === 'canCreatePrivateChannels') {
      allowed = entitlements.modules.chat.canCreatePrivateChannels;
    } else if (featureKey === 'canUseQaModule') {
      allowed = entitlements.modules.developer.canUseQaModule;
    }
  }

  if (!allowed) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-4 sm:p-8">
        <Card className="max-w-md w-full border-2 border-primary/20 shadow-xl overflow-hidden text-center">
          <div className="h-2 bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500" />
          <CardHeader className="pt-8 pb-4 flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-2 shadow-inner">
              <Lock className="w-7 h-7" />
            </div>
            <CardTitle className="text-xl font-bold tracking-tight">
              {featureName} Not Available
            </CardTitle>
            <CardDescription className="text-xs max-w-sm mt-1.5">
              {description || `The "${featureName}" feature is not included in the current plan for this workspace (${entitlements?.plan?.name || 'Current Tier'}).`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pb-8">
            <div className="p-3 bg-muted/60 rounded-xl text-xs text-muted-foreground border flex items-center gap-2 text-left">
              <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span>Contact your workspace owner or super administrator to upgrade your subscription tier.</span>
            </div>

            <Button
              onClick={() => router.push(`/workspace/${workspaceId}`)}
              variant="outline"
              className="w-full gap-2 text-xs"
            >
              Return to Workspace
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

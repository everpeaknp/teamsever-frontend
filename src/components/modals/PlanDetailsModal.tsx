"use client";

import React from "react";
import {
  Check,
  Briefcase,
  Clock,
  Users,
  Shield,
  Sparkles,
  Database,
  Zap,
  HardDrive,
  UserCheck
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CurrencyDisplay } from "@/components/currency/CurrencyDisplay";
import { Plan } from "@/types";

interface PlanDetailsModalProps {
  plan: Plan | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan?: (plan: Plan) => void;
  isCurrent?: boolean;
}

export function PlanDetailsModal({
  plan,
  isOpen,
  onClose,
  onSelectPlan,
  isCurrent = false,
}: PlanDetailsModalProps) {
  if (!plan) return null;

  const f = plan.features || ({} as any);
  const isFree = (plan.pricePerMemberMonthly ?? plan.price ?? 0) === 0;

  const storageDisplay = () => {
    if (f.maxStorageBytes === -1) return "Unlimited";
    if (!f.maxStorageBytes) return "1 GB";
    const gb = f.maxStorageBytes / (1024 * 1024 * 1024);
    return gb >= 1 ? `${Number.isInteger(gb) ? gb : gb.toFixed(1)} GB` : `${Math.round(f.maxStorageBytes / (1024 * 1024))} MB`;
  };

  const attendanceDisplay = () => {
    if (f.canUseAttendance === false || f.attendanceMode === "disabled") return "Disabled";
    if (f.attendanceMode === "both") return `Hybrid (Software + ${f.maxPhysicalTerminals === -1 ? 'Unlimited' : (f.maxPhysicalTerminals ?? 5)} Biometric Units)`;
    if (f.attendanceMode === "biometric") return `Biometric Hardware (${f.maxPhysicalTerminals === -1 ? 'Unlimited' : (f.maxPhysicalTerminals ?? 1)} Units)`;
    if (f.attendanceMode === "software_geofence") return "Software Punch + GPS Geofencing";
    return "Software Attendance (Web & Mobile)";
  };

  // Group capabilities cleanly into structured modules
  const featureGroups = [
    {
      title: "Core Work & Projects",
      icon: Briefcase,
      items: [
        { label: "Team Member Seats", value: f.maxMembers === -1 ? "Unlimited" : `Up to ${f.maxMembers ?? 5} members` },
        { label: "Tasks, Spaces & Folders", value: f.maxTasks === -1 ? "Unlimited" : `${f.maxTasks ?? 100} tasks` },
        { label: "Interactive Gantt Timeline", active: f.canUseGanttChart !== false },
        {
          label: "Custom Spreadsheet Tables",
          active: Boolean(f.canCreateTables),
          value: f.canCreateTables ? (f.maxTablesCount === -1 ? "Unlimited" : `Up to ${f.maxTablesCount} tables`) : undefined,
        },
        {
          label: "Custom Roles & Permissions",
          active: Boolean(f.canUseCustomRoles),
          value: f.canUseCustomRoles ? (f.maxCustomRoles === -1 ? "Unlimited" : `Up to ${f.maxCustomRoles} roles`) : undefined,
        },
        {
          label: "Access Control Tier",
          value: f.accessControlTier && f.accessControlTier !== 'none'
            ? `${f.accessControlTier.charAt(0).toUpperCase() + f.accessControlTier.slice(1)} Tier`
            : "Standard",
        },
      ],
    },
    {
      title: "Attendance & Time Tracking",
      icon: Clock,
      items: [
        { label: "Attendance Mode", value: attendanceDisplay() },
        { label: "GPS Geofenced Punch-in", active: Boolean(f.canUseGeoFencing || (f.attendanceMode && ['software_geofence', 'both'].includes(f.attendanceMode))) },
        {
          label: "Biometric Hardware Terminals",
          active: Boolean(f.canUsePhysicalTerminals || (f.attendanceMode && ['biometric', 'both'].includes(f.attendanceMode))),
          value: (f.canUsePhysicalTerminals || (f.attendanceMode && ['biometric', 'both'].includes(f.attendanceMode)))
            ? (f.maxPhysicalTerminals === -1 ? "Unlimited Terminals" : `${f.maxPhysicalTerminals ?? 1} Terminal${(f.maxPhysicalTerminals ?? 1) > 1 ? 's' : ''}`)
            : undefined,
        },
        { label: "Shifts & Rostering", active: f.canUseShiftsAndRostering !== false },
        { label: "GPS Field Worker Visits & Tracking", active: Boolean(f.canUseFieldTracking) },
        { label: "Desktop Presence & App Tracking", active: Boolean(f.canUseDesktopTracking) },
      ],
    },
    {
      title: "People Ops & Core HR",
      icon: Users,
      items: [
        { label: "Employee Directory & Org Chart", active: Boolean(f.canUseHrCore) },
        { label: "Leave Requests & Time-Off Approvals", active: Boolean(f.canUseLeaveManagement || f.canUseHrCore) },
        { label: "Company Documents & Contracts", active: Boolean(f.canUseCompanyDocuments || f.canUseHrCore) },
        { label: "Onboarding & Probation Checklists", active: Boolean(f.canUseOnboardingOffboarding) },
        { label: "Recruitment & Candidate Pipeline", active: Boolean(f.canUseRecruitment) },
      ],
    },
    {
      title: "Payroll & Finance",
      icon: Shield,
      items: [
        { label: "Automated Payroll Engine & Payslips", active: Boolean(f.canUsePayroll) },
        { label: "Expense Claims & Reimbursements", active: Boolean(f.canUseExpenseClaims || f.canUsePayroll) },
      ],
    },
    {
      title: "Collaboration & Developer Tools",
      icon: Sparkles,
      items: [
        { label: "Group Chat & Team Messaging", active: f.hasGroupChat !== false },
        { label: "Private Channels & Direct Messages", active: Boolean(f.canCreatePrivateChannels) },
        {
          label: "Message Retention History",
          value: (!f.chatHistoryDays || f.chatHistoryDays === -1) ? "Unlimited retention" : `${f.chatHistoryDays}-day retention`,
        },
        {
          label: "GitHub Repositories Integration",
          active: f.canUseGithubIntegration !== false,
          value: f.canUseGithubIntegration !== false
            ? (f.maxGithubRepositories === -1 ? "Unlimited" : `Up to ${f.maxGithubRepositories ?? 2} repos`)
            : undefined,
        },
        {
          label: "QA Test Suites & Case Management",
          active: Boolean(f.canUseQaModule),
          value: f.canUseQaModule
            ? (f.maxQaSuites === -1 ? "Unlimited suites" : `Up to ${f.maxQaSuites} suites`)
            : undefined,
        },
        { label: "Webhooks API", active: Boolean(f.canUseWebhooks) },
      ],
    },
    {
      title: "Storage, Security & Compliance",
      icon: Database,
      items: [
        { label: "Unified Workspace Storage Pool", value: storageDisplay() },
        { label: "Report Exports (PDF, CSV, Excel)", active: Boolean(f.canExportReports) },
        { label: "Security & Action Audit Logs", active: Boolean(f.canViewAuditLogs) },
        { label: "Analytics Tier", value: f.analyticsTier === 'full' ? "Full Advanced" : "Basic Overview" },
      ],
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl max-h-[88vh] flex flex-col p-0 overflow-hidden bg-background border border-border shadow-2xl rounded-2xl">
        {/* Header */}
        <div className="px-6 py-5 border-b border-border/80 bg-neutral-50/60 dark:bg-neutral-900/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <DialogTitle className="text-2xl font-bold tracking-tight text-foreground">
                  {plan.name}
                </DialogTitle>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  {isFree ? "Free Tier" : "Full Plan Specs"}
                </span>
              </div>
              <DialogDescription className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                {plan.description}
              </DialogDescription>
            </div>

            <div className="sm:text-right shrink-0">
              <div className="flex items-baseline sm:justify-end gap-1">
                <CurrencyDisplay
                  amount={plan.pricePerMemberMonthly ?? plan.price ?? 0}
                  baseCurrency={plan.baseCurrency || "NPR"}
                  className="text-2xl sm:text-3xl font-extrabold text-foreground"
                />
                <span className="text-xs text-muted-foreground font-medium">/member/mo</span>
              </div>
              <span className="text-[11px] text-muted-foreground block">
                {isFree ? "Free forever" : "Per seat subscription"}
              </span>
            </div>
          </div>

          {/* Quick Snapshot Pills */}
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-foreground border border-neutral-200 dark:border-neutral-700">
              <UserCheck className="h-3.5 w-3.5 text-blue-500" />
              <span>{f.maxMembers === -1 ? "Unlimited Seats" : `Up to ${f.maxMembers ?? 5} Seats`}</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-foreground border border-neutral-200 dark:border-neutral-700">
              <HardDrive className="h-3.5 w-3.5 text-blue-500" />
              <span>{storageDisplay()} Unified Storage</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-foreground border border-neutral-200 dark:border-neutral-700">
              <Clock className="h-3.5 w-3.5 text-blue-500" />
              <span>{f.attendanceMode === "both" ? "Hybrid Attendance" : f.attendanceMode === "software_geofence" ? "GPS Geofenced Punch" : "Software Punch"}</span>
            </div>
          </div>
        </div>

        {/* Categorized Body */}
        <ScrollArea className="flex-1 p-6 overflow-y-auto">
          <div className="space-y-6">
            {featureGroups.map((group) => {
              // Filter to active or valued items
              const visibleItems = group.items.filter(
                (item) => item.active !== false || item.value !== undefined
              );

              return (
                <div key={group.title} className="space-y-3">
                  <div className="flex items-center gap-2 pb-1.5 border-b border-border/50">
                    <group.icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      {group.title}
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {visibleItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border/50 bg-neutral-50/40 dark:bg-neutral-900/20 hover:bg-neutral-50 dark:hover:bg-neutral-900/40 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-4 w-4 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                            <Check className="h-2.5 w-2.5 stroke-[3]" />
                          </div>
                          <span className="text-xs sm:text-sm font-medium text-foreground truncate">
                            {item.label}
                          </span>
                        </div>

                        {item.value && (
                          <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded shrink-0">
                            {item.value}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        {/* Clean Footer */}
        <div className="px-6 py-4 border-t border-border bg-neutral-50/60 dark:bg-neutral-900/40 flex items-center justify-between gap-3">
          <Button variant="ghost" onClick={onClose} className="rounded-xl text-xs sm:text-sm">
            Close
          </Button>

          {onSelectPlan && (
            isCurrent ? (
              <Button disabled variant="outline" className="rounded-xl text-xs sm:text-sm">
                Current Plan
              </Button>
            ) : (
              <Button
                onClick={() => {
                  onClose();
                  onSelectPlan(plan);
                }}
                className="bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl gap-2 text-xs sm:text-sm font-semibold shadow-sm"
              >
                <Zap className="h-4 w-4" />
                {isFree ? "Start with Free Plan" : "Choose this Plan"}
              </Button>
            )
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

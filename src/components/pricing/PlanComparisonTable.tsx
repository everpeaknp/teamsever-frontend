"use client";

import React from "react";
import { Check, Minus, Sparkles, Shield, Clock, Users, Briefcase, Lock, Database } from "lucide-react";
import { Plan } from "@/types";

interface PlanComparisonTableProps {
  plans: Plan[];
  className?: string;
}

export function PlanComparisonTable({ plans, className = "" }: PlanComparisonTableProps) {
  if (!plans || plans.length === 0) return null;

  const categories = [
    {
      name: "Core Work & Projects",
      icon: Briefcase,
      rows: [
        {
          label: "Team Members / Seats",
          getValue: (p: Plan) => {
            if (p.features?.maxMembers === -1) return "Unlimited";
            return `Up to ${p.features?.maxMembers ?? 5}`;
          },
        },
        {
          label: "Tasks Quota",
          getValue: (p: Plan) => {
            if (p.features?.maxTasks === -1) return "Unlimited";
            return `${p.features?.maxTasks ?? 100} tasks`;
          },
        },
        {
          label: "Spaces & Folders",
          getValue: (p: Plan) => {
            if (p.features?.maxSpaces === -1 && p.features?.maxFolders === -1) return "Unlimited";
            return `${p.features?.maxSpaces ?? 5} spaces`;
          },
        },
        {
          label: "Interactive Gantt Chart",
          getValue: (p: Plan) => p.features?.canUseGanttChart !== false,
        },
        {
          label: "Custom Spreadsheet Tables",
          getValue: (p: Plan) => {
            if (!p.features?.canCreateTables) return false;
            return p.features.maxTablesCount === -1 ? "Unlimited" : `Up to ${p.features.maxTablesCount}`;
          },
        },
        {
          label: "Custom Roles & Permissions",
          getValue: (p: Plan) => {
            if (!p.features?.canUseCustomRoles) return false;
            return p.features.maxCustomRoles === -1 ? "Unlimited" : `Up to ${p.features.maxCustomRoles}`;
          },
        },
        {
          label: "Access Control Tier",
          getValue: (p: Plan) => {
            if (!p.features?.hasAccessControl || p.features?.accessControlTier === 'none') return "Basic";
            const tier = p.features.accessControlTier || 'basic';
            return tier.charAt(0).toUpperCase() + tier.slice(1);
          },
        },
      ],
    },
    {
      name: "Attendance, Tracking & Field Visits",
      icon: Clock,
      rows: [
        {
          label: "Software Attendance (Web & Mobile)",
          getValue: (p: Plan) => {
            if (p.features?.canUseAttendance === false || p.features?.attendanceMode === 'disabled') return false;
            return true;
          },
        },
        {
          label: "GPS Geo-fenced Clock-in",
          getValue: (p: Plan) => Boolean(p.features?.canUseGeoFencing || p.features?.attendanceMode === 'software_geofence' || p.features?.attendanceMode === 'both'),
        },
        {
          label: "Biometric Hardware Terminals",
          getValue: (p: Plan) => {
            if (!p.features?.canUsePhysicalTerminals && p.features?.attendanceMode !== 'biometric' && p.features?.attendanceMode !== 'both') return false;
            return p.features.maxPhysicalTerminals === -1 ? "Unlimited" : `${p.features.maxPhysicalTerminals ?? 1} devices`;
          },
        },
        {
          label: "Work Shifts & Rostering",
          getValue: (p: Plan) => p.features?.canUseShiftsAndRostering !== false,
        },
        {
          label: "GPS Field Worker Tracking & Visits",
          getValue: (p: Plan) => Boolean(p.features?.canUseFieldTracking),
        },
        {
          label: "Desktop Presence & App Tracking",
          getValue: (p: Plan) => Boolean(p.features?.canUseDesktopTracking),
        },
      ],
    },
    {
      name: "Core HR & People Operations",
      icon: Users,
      rows: [
        {
          label: "Employee Records & Org Chart",
          getValue: (p: Plan) => Boolean(p.features?.canUseHrCore),
        },
        {
          label: "Leave Management & Time-Off",
          getValue: (p: Plan) => Boolean(p.features?.canUseLeaveManagement || p.features?.canUseHrCore),
        },
        {
          label: "Company Documents & Contracts",
          getValue: (p: Plan) => Boolean(p.features?.canUseCompanyDocuments || p.features?.canUseHrCore),
        },
        {
          label: "Employee Onboarding & Checklists",
          getValue: (p: Plan) => Boolean(p.features?.canUseOnboardingOffboarding),
        },
        {
          label: "Recruitment & Job Pipeline",
          getValue: (p: Plan) => Boolean(p.features?.canUseRecruitment),
        },
      ],
    },
    {
      name: "Payroll & Finance",
      icon: Shield,
      rows: [
        {
          label: "Payroll Engine & Payslips",
          getValue: (p: Plan) => Boolean(p.features?.canUsePayroll),
        },
        {
          label: "Expense Claims & Reimbursements",
          getValue: (p: Plan) => Boolean(p.features?.canUseExpenseClaims || p.features?.canUsePayroll),
        },
      ],
    },
    {
      name: "Collaboration & Developer Tools",
      icon: Sparkles,
      rows: [
        {
          label: "Group Chat & Team Messaging",
          getValue: (p: Plan) => p.features?.hasGroupChat !== false,
        },
        {
          label: "Private Channels & Direct Messages",
          getValue: (p: Plan) => Boolean(p.features?.canCreatePrivateChannels),
        },
        {
          label: "Message History Retention",
          getValue: (p: Plan) => {
            const days = p.features?.chatHistoryDays;
            if (!days || days === -1) return "Unlimited";
            return `${days} days`;
          },
        },
        {
          label: "GitHub Repositories Integration",
          getValue: (p: Plan) => {
            if (p.features?.canUseGithubIntegration === false) return false;
            return p.features?.maxGithubRepositories === -1 ? "Unlimited" : `Up to ${p.features?.maxGithubRepositories ?? 2}`;
          },
        },
        {
          label: "QA Test Suites & Case Management",
          getValue: (p: Plan) => {
            if (!p.features?.canUseQaModule) return false;
            return p.features.maxQaSuites === -1 ? "Unlimited" : `Up to ${p.features.maxQaSuites} suites`;
          },
        },
        {
          label: "Webhooks API",
          getValue: (p: Plan) => Boolean(p.features?.canUseWebhooks),
        },
      ],
    },
    {
      name: "Storage, Security & Compliance",
      icon: Database,
      rows: [
        {
          label: "Unified Workspace Storage Pool",
          getValue: (p: Plan) => {
            const bytes = p.features?.maxStorageBytes;
            if (bytes === -1) return "Unlimited";
            if (!bytes) return "1 GB";
            const gb = bytes / (1024 * 1024 * 1024);
            return gb >= 1 ? `${Number.isInteger(gb) ? gb : gb.toFixed(1)} GB` : `${Math.round(bytes / (1024 * 1024))} MB`;
          },
        },
        {
          label: "Report Exports (PDF, CSV, Excel)",
          getValue: (p: Plan) => Boolean(p.features?.canExportReports),
        },
        {
          label: "Security Audit Logs",
          getValue: (p: Plan) => Boolean(p.features?.canViewAuditLogs),
        },
        {
          label: "Analytics Tier",
          getValue: (p: Plan) => p.features?.analyticsTier === 'full' ? "Full Advanced" : "Basic Overview",
        },
      ],
    },
  ];

  return (
    <div className={`w-full overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-card shadow-sm ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          {/* Header */}
          <thead>
            <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50/90 dark:bg-neutral-900/80">
              <th className="py-5 px-6 font-semibold text-neutral-900 dark:text-neutral-100 min-w-[280px] sticky left-0 bg-neutral-50 dark:bg-neutral-900 z-20 border-r border-neutral-200 dark:border-neutral-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                <span className="text-xs uppercase tracking-wider text-muted-foreground block mb-1">Comparison</span>
                Features & Capabilities
              </th>
              {plans.map((plan) => (
                <th key={plan._id} className="py-5 px-6 text-center font-bold text-neutral-900 dark:text-neutral-100 min-w-[180px]">
                  <div className="text-base">{plan.name}</div>
                  <div className="text-xs font-normal text-muted-foreground mt-0.5">
                    {plan.price === 0 || plan.pricePerMemberMonthly === 0
                      ? "Free"
                      : `${plan.baseCurrency || 'Rs.'} ${plan.pricePerMemberMonthly || plan.price}/member`}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
            {categories.map((category) => (
              <React.Fragment key={category.name}>
                {/* Category Header Row */}
                <tr className="bg-neutral-50/50 dark:bg-neutral-900/30">
                  <td
                    colSpan={plans.length + 1}
                    className="py-3 px-6 text-xs font-bold uppercase tracking-wider text-[#2563EB] dark:text-blue-400 sticky left-0 z-10"
                  >
                    <div className="flex items-center gap-2">
                      <category.icon className="h-4 w-4" />
                      <span>{category.name}</span>
                    </div>
                  </td>
                </tr>

                {/* Feature Rows */}
                {category.rows.map((row) => (
                  <tr key={row.label} className="hover:bg-neutral-50/40 dark:hover:bg-neutral-800/30 transition-colors">
                    <td className="py-3.5 px-6 text-sm text-neutral-700 dark:text-neutral-300 font-medium sticky left-0 bg-white dark:bg-card z-10 border-r border-neutral-100 dark:border-neutral-800/80 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                      {row.label}
                    </td>
                    {plans.map((plan) => {
                      const val = row.getValue(plan);

                      return (
                        <td key={plan._id} className="py-3.5 px-6 text-center text-sm">
                          {typeof val === "boolean" ? (
                            val ? (
                              <div className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 mx-auto">
                                <Check className="h-4 w-4 stroke-[2.5]" />
                              </div>
                            ) : (
                              <Minus className="h-4 w-4 text-neutral-300 dark:text-neutral-600 mx-auto" />
                            )
                          ) : (
                            <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                              {val}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

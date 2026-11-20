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
    <div className={`w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_45px_rgba(15,23,42,0.06)] ${className}`}>
      <div className="pricing-table-scroll overflow-x-auto overscroll-x-contain">
        <table className="w-full border-collapse text-left text-sm">
          {/* Header */}
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="sticky left-0 z-20 min-w-[280px] border-r border-slate-200 bg-slate-50 px-6 py-5 font-semibold text-slate-950 shadow-[2px_0_5px_-2px_rgba(15,23,42,0.08)]">
                <span className="caption-3 mb-1 block uppercase tracking-wider text-blue-700">Comparison</span>
                Features & Capabilities
              </th>
              {plans.map((plan) => (
                <th key={plan._id} className="min-w-[180px] px-6 py-5 text-center font-bold text-slate-950">
                  <div className="title-3">{plan.name}</div>
                  <div className="caption-2 mt-0.5 text-slate-500">
                    {plan.price === 0 || plan.pricePerMemberMonthly === 0
                      ? "Free"
                      : `${plan.baseCurrency || 'Rs.'} ${plan.pricePerMemberMonthly || plan.price}/member`}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-slate-100">
            {categories.map((category) => (
              <React.Fragment key={category.name}>
                {/* Category Header Row */}
                <tr className="bg-blue-50/60">
                  <td
                    colSpan={plans.length + 1}
                    className="px-6 py-3 text-xs font-bold uppercase tracking-wider text-blue-700"
                  >
                    <div className="flex items-center gap-2">
                      <category.icon className="h-4 w-4" />
                      <span>{category.name}</span>
                    </div>
                  </td>
                </tr>

                {/* Feature Rows */}
                {category.rows.map((row) => (
                  <tr key={row.label} className="transition-colors hover:bg-slate-50">
                    <td className="sticky left-0 z-10 border-r border-slate-100 bg-white px-6 py-3.5 text-sm font-medium text-slate-700 shadow-[2px_0_5px_-2px_rgba(15,23,42,0.08)]">
                      {row.label}
                    </td>
                    {plans.map((plan) => {
                      const val = row.getValue(plan);

                      return (
                        <td key={plan._id} className="px-6 py-3.5 text-center text-sm">
                          {typeof val === "boolean" ? (
                            val ? (
                                <div className="mx-auto inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                                <Check className="h-4 w-4 stroke-[2.5]" />
                              </div>
                            ) : (
                              <Minus className="mx-auto h-4 w-4 text-slate-300" />
                            )
                          ) : (
                            <span className="font-semibold text-slate-800">
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

import { Plan } from "@/types";

const formatLimit = (value: number | undefined) => {
  if (value === undefined || value === null) return "Not set";
  return value === -1 ? "Unlimited" : String(value);
};

export function getPlanFeatureLines(plan: Plan): string[] {
  const f = plan.features || ({} as any);
  const lines: string[] = [];

  // 1. Members
  if (f.maxMembers === -1) {
    lines.push("Unlimited Members / Workspace");
  } else if (f.maxMembers) {
    lines.push(`Up to ${f.maxMembers} Members / Workspace`);
  }

  // 2. Storage
  if (f.maxStorageBytes !== undefined) {
    if (f.maxStorageBytes === -1) {
      lines.push("Unlimited Unified Storage");
    } else {
      const gb = f.maxStorageBytes / (1024 * 1024 * 1024);
      if (gb >= 1) {
        lines.push(`${Number.isInteger(gb) ? gb : gb.toFixed(1)} GB Unified Storage`);
      } else {
        const mb = Math.round(f.maxStorageBytes / (1024 * 1024));
        lines.push(`${mb} MB Unified Storage`);
      }
    }
  }

  // Attendance & Clocking
  if (f.canUseAttendance !== false && f.attendanceMode !== 'disabled') {
    if (f.attendanceMode === 'software') {
      lines.push("Software Attendance (Web & Mobile)");
    } else if (f.attendanceMode === 'software_geofence') {
      lines.push("Software Attendance + GPS Geofencing");
    } else if (f.attendanceMode === 'biometric') {
      lines.push(
        f.maxPhysicalTerminals === -1
          ? "Biometric Hardware Terminals (Unlimited)"
          : `Biometric Hardware Terminals (${f.maxPhysicalTerminals ?? 1} units)`
      );
    } else if (f.attendanceMode === 'both') {
      lines.push(
        f.maxPhysicalTerminals === -1
          ? "Hybrid Attendance (Software + Unlimited Terminals)"
          : `Hybrid Attendance (Software + ${f.maxPhysicalTerminals ?? 5} Terminals)`
      );
    }
  }

  // 5. Employee Tracking
  if (f.canUseFieldTracking && f.canUseDesktopTracking) {
    lines.push("GPS Field Tracking & Desktop Presence");
  } else if (f.canUseFieldTracking) {
    lines.push("GPS Field Worker Tracking");
  } else if (f.canUseDesktopTracking) {
    lines.push("Desktop Presence & App Tracking");
  }

  // 6. HR & Payroll
  if (f.canUseHrCore) {
    lines.push("Core HR & Employee Directory");
  }
  if (f.canUseLeaveManagement) {
    lines.push("Leave Management & Time Off");
  }
  if (f.canUsePayroll) {
    lines.push("Payroll Processing & Tax Runs");
  }
  if (f.canUseExpenseClaims) {
    lines.push("Expense Claims & Reimbursements");
  }
  if (f.canUseRecruitment) {
    lines.push("Recruitment & Job Pipeline");
  }

  // 7. Roles & Access Control
  if (f.canUseCustomRoles) {
    lines.push(
      f.maxCustomRoles === -1
        ? "Unlimited Custom Roles"
        : `Up to ${f.maxCustomRoles} Custom Roles`
    );
  }
  if (f.canUsePredefinedRoles && f.maxPredefinedRoles && f.maxPredefinedRoles > 0) {
    lines.push(
      f.maxPredefinedRoles === -1
        ? "Predefined Roles"
        : `${f.maxPredefinedRoles} Predefined Roles`
    );
  }
  if (f.hasAccessControl && f.accessControlTier && f.accessControlTier !== 'none') {
    const tier = f.accessControlTier.charAt(0).toUpperCase() + f.accessControlTier.slice(1);
    lines.push(`${tier} Access Control & Permissions`);
  }

  // 8. Projects & Tables
  if (f.canUseGanttChart) {
    lines.push("Interactive Gantt Timeline");
  }
  if (f.canCreateTables) {
    lines.push(
      f.maxTablesCount === -1
        ? "Custom Spreadsheet Tables"
        : `Up to ${f.maxTablesCount} Custom Tables`
    );
  }

  // 9. Communication
  if (f.hasGroupChat) {
    if (f.canCreatePrivateChannels) {
      lines.push("Group Chat & Private Channels");
    } else {
      lines.push(
        f.chatHistoryDays && f.chatHistoryDays > 0
          ? `Team Chat (${f.chatHistoryDays}-day history)`
          : "Team Chat Channels"
      );
    }
  }

  // 10. Integrations & QA
  if (f.canUseGithubIntegration) {
    lines.push(
      f.maxGithubRepositories === -1
        ? "Unlimited GitHub Integrations"
        : `GitHub Integration (${f.maxGithubRepositories} repos)`
    );
  }
  if (f.canUseQaModule) {
    lines.push(
      f.maxQaSuites === -1
        ? "QA Testing (Unlimited Suites)"
        : `QA Testing (${f.maxQaSuites} suites)`
    );
  }

  // 11. Compliance & Security
  if (f.canExportReports) {
    lines.push("Report Exports (PDF/CSV/XLSX)");
  }
  if (f.canViewAuditLogs) {
    lines.push("Security Audit Logs");
  }
  if (f.analyticsTier === 'full') {
    lines.push("Full Analytics & Insights");
  }

  return lines;
}

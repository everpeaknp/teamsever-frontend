import { Plan } from "@/types";

const formatLimit = (value: number | undefined) => {
  if (value === undefined || value === null) return "Not set";
  return value === -1 ? "Unlimited" : String(value);
};

export function getPlanFeatureLines(plan: Plan): string[] {
  const f = plan.features;
  const lines: string[] = [];

  lines.push(`${formatLimit(f.maxWorkspaces)} Workspaces`);
  lines.push(`${formatLimit(f.maxMembers)} Members/workspace`);
  lines.push(`${formatLimit(f.maxAdmins)} Admins`);
  lines.push(`${formatLimit(f.maxSpaces)} Spaces`);
  lines.push(`${formatLimit(f.maxFolders)} Folders`);
  lines.push(`${formatLimit(f.maxLists)} Lists`);
  lines.push(`${formatLimit(f.maxTasks)} Tasks`);

  lines.push(
    f.hasAccessControl
      ? `${(f.accessControlTier || "basic").charAt(0).toUpperCase()}${(f.accessControlTier || "basic").slice(1)} Access Control`
      : "Access Control (Disabled)"
  );

  if (f.canUseCustomRoles) {
    lines.push(`${formatLimit(f.maxCustomRoles)} Custom Roles`);
  } else {
    lines.push("Custom Roles (Disabled)");
  }

  if (f.canUsePredefinedRoles !== false) {
    lines.push(`${formatLimit(f.maxPredefinedRoles)} Predefined Roles`);
  } else {
    lines.push("Predefined Roles (Disabled)");
  }

  if (f.canCreateTables) {
    lines.push(
      `${formatLimit(f.maxTablesCount)} Tables (${formatLimit(f.maxRowsLimit)} rows, ${formatLimit(f.maxColumnsLimit)} cols)`
    );
  } else {
    lines.push("Custom Tables (Disabled)");
  }

  if (f.hasGroupChat) {
    lines.push(`Group Chat (${formatLimit(f.messageLimit)} msgs/month)`);
  } else {
    lines.push("Group Chat (Disabled)");
  }

  lines.push(`${formatLimit(f.maxDirectMessagesPerUser)} DMs/user`);

  if (f.canCreatePrivateChannels) {
    lines.push(
      `${formatLimit(f.maxPrivateChannelsCount)} Private Groups (max ${formatLimit(f.maxMembersPerPrivateChannel)} members)`
    );
  } else {
    lines.push("Private Groups (Disabled)");
  }

  lines.push(`${formatLimit(f.maxFiles)} Files/user`);
  lines.push(`${formatLimit(f.maxDocuments)} Documents/user`);
  lines.push(
    f.announcementCooldown === 0
      ? "No Announcement Cooldown"
      : `${f.announcementCooldown}h Announcement Cooldown`
  );

  lines.push(f.canUseWebhooks ? "Webhooks Enabled" : "Webhooks Disabled");
  lines.push(f.canUseAdvancedAnalytics ? "Advanced Analytics Enabled" : "Advanced Analytics Disabled");
  lines.push(f.canUseAttendance ? "Attendance Enabled" : "Attendance Disabled");
  lines.push(f.canUseFileSharing ? "File Sharing Enabled" : "File Sharing Disabled");
  lines.push(
    f.canUseNotificationPreferences
      ? "Notification Preferences Enabled"
      : "Notification Preferences Disabled"
  );

  return lines;
}

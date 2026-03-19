import { IWorkspaceMember } from '@/types/pro-features';

/**
 * Get the display name for a workspace member's role
 * Returns customRoleTitle if set, otherwise returns the default role name
 */
export const getMemberRoleDisplay = (member: IWorkspaceMember | any): string => {
  if (member.customRoleTitle) {
    return member.customRoleTitle;
  }
  
  // Fallback to default role name
  const role = member.role || 'member';
  return role.charAt(0).toUpperCase() + role.slice(1);
};

/**
 * Get member name from user object or string
 */
export const getMemberName = (user: string | { _id: string; name: string; email: string }): string => {
  if (typeof user === 'string') {
    return 'Unknown';
  }
  return user.name;
};

/**
 * Get member ID from user object or string
 */
export const getMemberId = (user: string | { _id: string; name: string; email: string }): string => {
  if (typeof user === 'string') {
    return user;
  }
  return user._id;
};

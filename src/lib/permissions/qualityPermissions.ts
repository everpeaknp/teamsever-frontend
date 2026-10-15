export const QUALITY_PERMISSION_ACTIONS = [
  'QA_VIEW',
  'QA_MANAGE_CASES',
  'QA_EXECUTE',
  'QA_CREATE_BUG',
  'QA_TRIAGE_BUG',
  'QA_VERIFY_BUG',
  'QA_MANAGE_RELEASES',
  'QA_SIGN_OFF',
] as const;

export type QualityPermissionAction = (typeof QUALITY_PERMISSION_ACTIONS)[number];

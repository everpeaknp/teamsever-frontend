export function getManageWorkspaceHref(
  pathname: string,
  currentWorkspaceId: string | null,
): string {
  const workspaceFromRoute = pathname.match(/^\/workspace\/([^/]+)/)?.[1];
  const workspaceId = workspaceFromRoute || currentWorkspaceId;
  return workspaceId ? `/workspace/${workspaceId}/settings` : '/dashboard';
}

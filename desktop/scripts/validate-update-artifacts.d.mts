export function validateUpdateArtifacts(
  platform: 'win' | 'linux',
  assets: Record<string, string>,
): true;

export function isDirectExecution(moduleUrl: string, entryPath?: string): boolean;

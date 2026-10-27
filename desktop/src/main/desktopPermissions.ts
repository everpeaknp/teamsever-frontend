export type DesktopPermissionRequest = { requestingUrl?: string; permission: string };

export function createGeolocationPermissionHandler(
  appOrigin: string | undefined,
  prompt: () => Promise<boolean>,
) {
  let decision: boolean | null = null;
  let pendingDecision: Promise<boolean> | null = null;

  return (details: DesktopPermissionRequest, callback: (allowed: boolean) => void) => {
    if (details.permission !== 'geolocation' || !appOrigin || !details.requestingUrl) {
      callback(false);
      return;
    }
    let origin: string;
    try {
      origin = new URL(details.requestingUrl).origin;
    } catch {
      callback(false);
      return;
    }
    if (origin !== appOrigin) {
      callback(false);
      return;
    }
    if (decision !== null) {
      callback(decision);
      return;
    }

    pendingDecision ||= prompt().then((allowed) => {
      decision = allowed === true;
      return decision;
    }).finally(() => { pendingDecision = null; });
    void pendingDecision.then((allowed) => callback(allowed)).catch(() => callback(false));
  };
}

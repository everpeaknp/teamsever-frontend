export type DesktopUpdateState =
  | { type: 'checking' }
  | { type: 'available'; version: string }
  | { type: 'downloading'; percent: number }
  | { type: 'downloaded'; version: string }
  | { type: 'not-available' }
  | { type: 'deferred'; version: string; reason: 'clocked-in' | 'status-unavailable' }
  | { type: 'error'; message: string };

export {};

declare global {
  interface Window {
    teamseverDesktop?: {
      getCapabilities: () => Promise<{ platform: string; credentialInstalled: boolean; foregroundMonitoringSupported: boolean; foregroundUnavailableReason?: string; idleDetectionSupported: boolean; idleDetectionUnavailableReason?: string }>;
      storeCredential: (credential: string) => Promise<{ stored: boolean }>;
      forgetCredential: () => Promise<{ forgotten: boolean }>;
      setMonitoringEnabled: (enabled: boolean) => Promise<{ enabled: boolean }>;
      getStatus: () => Promise<{ clockedIn: boolean; clockedInOnThisDevice: boolean; presenceTrackingActive: boolean; clockInSource?: 'web' | 'desktop' | 'mobile' | null; workspaceId: string | null; timeEntryId: string | null; startTime: string | null; activityMonitoringEnabled: boolean; pendingMobileShift?: { timeEntryId: string; workspaceId: string; startTime: string } | null }>;
      pairMobileCode: (code: string) => Promise<{ synced: boolean }>;
      getCurrentPresence: () => Promise<{ appId: string | null; presenceStatus: 'active' | 'afk' | 'unavailable'; startedAt: string } | null>;
      attachPresenceToActiveShift: () => Promise<{ attached: boolean }>;
      toggleClock: (input: { workspaceId: string; status: 'active' | 'inactive'; locationFix?: { latitude: number; longitude: number; accuracyMeters: number; capturedAt: string } }) => Promise<{ data: { success: boolean; data: { status: string; timeEntry?: any } } }>;
      onUpdateState?: (callback: (state: DesktopUpdateState) => void) => () => void;
      getUpdateState?: () => Promise<DesktopUpdateState | null>;
      installUpdate?: () => Promise<boolean>;
      checkForUpdates?: () => Promise<DesktopUpdateState | null>;
      openLatestDownload?: () => Promise<void>;
    };
  }
}

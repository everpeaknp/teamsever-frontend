export {};

declare global {
  interface Window {
    teamseverDesktop?: {
      getCapabilities: () => Promise<{ platform: string; credentialInstalled: boolean; foregroundMonitoringSupported: boolean; foregroundUnavailableReason?: string; idleDetectionSupported: boolean; idleDetectionUnavailableReason?: string }>;
      storeCredential: (credential: string) => Promise<{ stored: boolean }>;
      forgetCredential: () => Promise<{ forgotten: boolean }>;
      setMonitoringEnabled: (enabled: boolean) => Promise<{ enabled: boolean }>;
      getStatus: () => Promise<{ clockedIn: boolean; workspaceId: string | null; timeEntryId: string | null; startTime: string | null; activityMonitoringEnabled: boolean }>;
      toggleClock: (input: { workspaceId: string; status: 'active' | 'inactive'; locationFix?: { latitude: number; longitude: number; accuracyMeters: number; capturedAt: string } }) => Promise<{ data: { success: boolean; data: { status: string; timeEntry?: any } } }>;
    };
  }
}

import { classifyPresence, normalizeAppId, type PresenceStatus } from './tracker';

export interface DesktopPresenceAuthorization {
  workspaceId: string;
  timeEntryId: string;
  startTime: string;
  activityMonitoringEnabled: boolean;
  /** clockedIn is true only when the server confirms this trusted device owns the active shift. */
  clockedIn: boolean;
}

export interface DesktopPresenceHeartbeat {
  workspaceId: string;
  timeEntryId: string;
  appId: string | null;
  presenceStatus: PresenceStatus;
  foregroundAppSupported: boolean;
  idleDetectionSupported: boolean;
  startedAt: string;
  endedAt: string;
}

interface Dependencies {
  getAuthorization: () => Promise<DesktopPresenceAuthorization | null>;
  getAfkThresholdMinutes: (workspaceId: string) => Promise<number>;
  readIdleSeconds: () => number | null;
  readForegroundApp: () => Promise<string | null>;
  foregroundAppSupported: () => boolean;
  sendHeartbeat: (event: DesktopPresenceHeartbeat) => Promise<unknown>;
  now?: () => number;
}

const HEARTBEAT_INTERVAL_MS = 60_000;
const MAX_SAMPLE_GAP_MS = 90_000;
const MAX_INTERVAL_MS = 5 * 60_000;

export class DesktopPresenceSession {
  private enabledShift: DesktopPresenceAuthorization | null = null;
  private thresholdMinutes = 5;
  private segmentStartedAt: number | null = null;
  private heartbeatStartedAt: number | null = null;
  private lastSampleAt: number | null = null;
  private segmentState: Omit<DesktopPresenceHeartbeat, 'startedAt' | 'endedAt'> | null = null;
  private pendingSegments: DesktopPresenceHeartbeat[] = [];
  private now: () => number;

  constructor(private readonly deps: Dependencies) { this.now = deps.now || Date.now; }

  async start(shift: DesktopPresenceAuthorization): Promise<boolean> {
    this.stop();
    if (!this.isEligible(shift)) return false;
    try {
      this.thresholdMinutes = await this.deps.getAfkThresholdMinutes(shift.workspaceId);
      this.enabledShift = { ...shift };
      return true;
    } catch { return false; }
  }

  stop(): void {
    this.enabledShift = null;
    this.segmentStartedAt = null;
    this.heartbeatStartedAt = null;
    this.lastSampleAt = null;
    this.segmentState = null;
    this.pendingSegments = [];
  }

  get isRunning(): boolean { return this.enabledShift !== null; }

  async sample(): Promise<void> {
    const shift = this.enabledShift;
    if (!shift) return;
    let authorization: DesktopPresenceAuthorization | null;
    try { authorization = await this.deps.getAuthorization(); }
    catch (error) {
      const status = typeof error === 'object' && error !== null && 'status' in error ? Number((error as { status?: unknown }).status) : 0;
      if (status === 401 || status === 403) { this.stop(); return; }
      // Permission cannot be verified while offline; drop this interval and never backfill it.
      this.resetInterval();
      return;
    }
    if (!authorization || !this.isEligible(authorization) || authorization.workspaceId !== shift.workspaceId || authorization.timeEntryId !== shift.timeEntryId) {
      this.stop();
      return;
    }

    const sampledAt = this.now();
    const idleSeconds = this.readIdleSecondsSafely();
    const idleDetectionSupported = idleSeconds !== null;
    const appId = await this.readForegroundAppSafely();
    let foregroundAppSupported = false;
    try { foregroundAppSupported = this.deps.foregroundAppSupported(); } catch { foregroundAppSupported = false; }
    const presenceStatus = idleDetectionSupported ? classifyPresence(idleSeconds, this.thresholdMinutes) : 'unavailable';
    const nextState: Omit<DesktopPresenceHeartbeat, 'startedAt' | 'endedAt'> = {
      workspaceId: shift.workspaceId, timeEntryId: shift.timeEntryId, appId, presenceStatus,
      foregroundAppSupported, idleDetectionSupported,
    };
    if (this.lastSampleAt !== null && sampledAt - this.lastSampleAt > MAX_SAMPLE_GAP_MS) this.resetInterval();
    this.lastSampleAt = sampledAt;
    if (this.segmentStartedAt === null || this.heartbeatStartedAt === null) {
      this.segmentStartedAt = sampledAt;
      this.heartbeatStartedAt = sampledAt;
      this.segmentState = nextState;
      return;
    }
    if (!this.sameState(this.segmentState, nextState)) {
      this.closeSegment(sampledAt, shift);
      this.segmentStartedAt = sampledAt;
      this.segmentState = nextState;
    }
    if (sampledAt - this.heartbeatStartedAt < HEARTBEAT_INTERVAL_MS) return;
    this.closeSegment(sampledAt, shift);
    this.heartbeatStartedAt = sampledAt;
    const batch = this.pendingSegments;
    this.pendingSegments = [];
    // Drop the batch on any write failure; never retry or backfill a stale interval.
    try { for (const event of batch) await this.deps.sendHeartbeat(event); }
    catch { this.resetInterval(); }
  }

  private sameState(left: Omit<DesktopPresenceHeartbeat, 'startedAt' | 'endedAt'> | null, right: Omit<DesktopPresenceHeartbeat, 'startedAt' | 'endedAt'>): boolean {
    return !!left && left.workspaceId === right.workspaceId && left.timeEntryId === right.timeEntryId && left.appId === right.appId && left.presenceStatus === right.presenceStatus && left.foregroundAppSupported === right.foregroundAppSupported && left.idleDetectionSupported === right.idleDetectionSupported;
  }

  private closeSegment(endedAt: number, shift: DesktopPresenceAuthorization): void {
    if (this.segmentStartedAt === null || !this.segmentState || endedAt <= this.segmentStartedAt) return;
    const startedAt = Math.max(this.segmentStartedAt, Date.parse(shift.startTime), endedAt - MAX_INTERVAL_MS);
    if (endedAt <= startedAt) return;
    this.pendingSegments.push({ ...this.segmentState, startedAt: new Date(startedAt).toISOString(), endedAt: new Date(endedAt).toISOString() });
    this.segmentStartedAt = endedAt;
  }

  private resetInterval(): void {
    this.segmentStartedAt = null;
    this.heartbeatStartedAt = null;
    this.lastSampleAt = null;
    this.segmentState = null;
    this.pendingSegments = [];
  }

  private isEligible(shift: DesktopPresenceAuthorization): boolean {
    return !!shift.clockedIn && !!shift.activityMonitoringEnabled && !!shift.workspaceId && !!shift.timeEntryId && Number.isFinite(Date.parse(shift.startTime));
  }

  private readIdleSecondsSafely(): number | null {
    try { const value = this.deps.readIdleSeconds(); return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null; }
    catch { return null; }
  }

  private async readForegroundAppSafely(): Promise<string | null> {
    try { const value = await this.deps.readForegroundApp(); return typeof value === 'string' ? normalizeAppId(value) : null; }
    catch { return null; }
  }
}

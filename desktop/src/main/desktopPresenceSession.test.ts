import { describe, expect, it, vi } from 'vitest';
import { DesktopPresenceSession, type DesktopPresenceAuthorization } from './desktopPresenceSession';

const shift: DesktopPresenceAuthorization = {
  workspaceId: 'workspace-1', timeEntryId: 'entry-1', startTime: '2026-10-01T08:00:00.000Z', activityMonitoringEnabled: true, clockedIn: true,
};

function fixture() {
  let now = Date.parse('2026-10-01T09:00:00.000Z');
  let authorization: DesktopPresenceAuthorization | null = shift;
  let idleSeconds: number | null = 0;
  let foregroundApp: string | null = 'code.exe';
  let appSupported = true;
  const sendHeartbeat = vi.fn(async (_event: unknown) => undefined);
  const session = new DesktopPresenceSession({
    getAuthorization: async () => authorization,
    getAfkThresholdMinutes: async () => 5,
    readIdleSeconds: () => idleSeconds,
    readForegroundApp: async () => foregroundApp,
    foregroundAppSupported: () => appSupported,
    sendHeartbeat,
    now: () => now,
  });
  return {
    session, sendHeartbeat,
    advance: (milliseconds: number) => { now += milliseconds; },
    setAuthorization: (value: DesktopPresenceAuthorization | null) => { authorization = value; },
    setIdleSeconds: (value: number | null) => { idleSeconds = value; },
    setForegroundApp: (value: string | null, supported = value !== null) => { foregroundApp = value; appSupported = supported; },
  };
}

describe('DesktopPresenceSession', () => {
  it('sends active/AFK reports only after the same consented desktop shift is verified', async () => {
    const f = fixture(); await f.session.start(shift); await f.session.sample(); f.advance(60_000); await f.session.sample();
    expect(f.sendHeartbeat).toHaveBeenCalledWith(expect.objectContaining({ presenceStatus: 'active', appId: 'code.exe' }));
    f.advance(15_000); f.setIdleSeconds(300); await f.session.sample();
    f.advance(45_000); await f.session.sample();
    expect(f.sendHeartbeat).toHaveBeenLastCalledWith(expect.objectContaining({ presenceStatus: 'afk' }));
  });

  it('splits a minute into truthful segments when AFK state changes between polls', async () => {
    const f = fixture(); await f.session.start(shift); await f.session.sample();
    f.advance(30_000); f.setIdleSeconds(300); await f.session.sample();
    f.advance(30_000); await f.session.sample();
    expect(f.sendHeartbeat).toHaveBeenCalledTimes(2);
    expect(f.sendHeartbeat.mock.calls[0][0]).toEqual(expect.objectContaining({ presenceStatus: 'active' }));
    expect(f.sendHeartbeat.mock.calls[1][0]).toEqual(expect.objectContaining({ presenceStatus: 'afk' }));
    const first = f.sendHeartbeat.mock.calls[0][0] as { startedAt: string; endedAt: string };
    const second = f.sendHeartbeat.mock.calls[1][0] as { startedAt: string; endedAt: string };
    expect(first.endedAt).toBe(second.startedAt);
  });

  it.each([
    ['web shift', { ...shift, timeEntryId: 'web-entry', clockedIn: false }],
    ['other device shift', { ...shift, timeEntryId: 'other-entry', clockedIn: false }],
    ['consent off', { ...shift, activityMonitoringEnabled: false }],
  ])('does not start for %s', async (_label, candidate) => {
    const f = fixture(); await f.session.start(candidate as DesktopPresenceAuthorization); await f.session.sample();
    expect(f.sendHeartbeat).not.toHaveBeenCalled();
  });

  it.each(['clock-out', 'revocation', 'consent withdrawal', 'status loss'])('stops when authorization is lost after %s', async () => {
    const f = fixture(); await f.session.start(shift); f.setAuthorization(null); await f.session.sample();
    f.setAuthorization(shift); f.advance(120_000); await f.session.sample();
    expect(f.sendHeartbeat).not.toHaveBeenCalled();
  });

  it('keeps AFK detection when foreground app detection is unavailable', async () => {
    const f = fixture(); f.setForegroundApp(null, false); f.setIdleSeconds(300); await f.session.start(shift); await f.session.sample();
    f.advance(60_000); await f.session.sample();
    expect(f.sendHeartbeat).toHaveBeenCalledWith(expect.objectContaining({ presenceStatus: 'afk', appId: null, foregroundAppSupported: false, idleDetectionSupported: true }));
  });

  it('reports a missing process name without falsely declaring foreground detection unsupported', async () => {
    const f = fixture(); f.setForegroundApp(null, true); await f.session.start(shift); await f.session.sample();
    f.advance(60_000); await f.session.sample();
    expect(f.sendHeartbeat).toHaveBeenCalledWith(expect.objectContaining({ appId: null, foregroundAppSupported: true }));
  });

  it('does not backfill a network outage into a long active or AFK interval', async () => {
    const f = fixture(); f.sendHeartbeat.mockRejectedValueOnce(new Error('offline'));
    await f.session.start(shift); await f.session.sample(); f.advance(60_000); await f.session.sample();
    f.advance(15 * 60_000); await f.session.sample(); f.advance(60_000); await f.session.sample();
    const last = f.sendHeartbeat.mock.calls.at(-1)?.[0] as { startedAt: string; endedAt: string };
    expect(Date.parse(last.endedAt) - Date.parse(last.startedAt)).toBeLessThanOrEqual(60_000);
  });

  it('starts a fresh interval after the local sampler misses a heartbeat-sized gap', async () => {
    const f = fixture(); await f.session.start(shift); await f.session.sample();
    f.advance(3 * 60_000); await f.session.sample();
    expect(f.sendHeartbeat).not.toHaveBeenCalled();
    f.advance(60_000); await f.session.sample();
    expect(f.sendHeartbeat).toHaveBeenCalledTimes(1);
    const sample = f.sendHeartbeat.mock.calls[0][0] as { startedAt: string; endedAt: string };
    expect(Date.parse(sample.endedAt) - Date.parse(sample.startedAt)).toBe(60_000);
  });
});

import type { DesktopUpdateState } from '../../../src/types/desktop';

export type { DesktopUpdateState } from '../../../src/types/desktop';

type UpdateEvent = 'checking-for-update' | 'update-available' | 'download-progress' | 'update-downloaded' | 'update-not-available' | 'error';
type UpdateListener = (value?: any) => void;

interface UpdaterAdapter {
  on: (event: UpdateEvent, listener: UpdateListener) => unknown;
  checkForUpdates: () => Promise<unknown>;
  quitAndInstall: () => void;
}

interface DesktopUpdaterDependencies {
  updater: UpdaterAdapter;
  getClockedIn: () => Promise<unknown>;
  publish: (state: DesktopUpdateState) => void;
}

const UPDATE_ERROR_MESSAGE = 'Could not check for desktop updates. You can download the latest version manually.';
const UPDATE_UNSUPPORTED_MESSAGE = 'Automatic updates are unavailable for this installation. You can download the latest version manually.';

export class DesktopUpdaterController {
  private downloadedVersion: string | null = null;
  private checkInFlight = false;
  private installing = false;
  private installErrorDuringCall = false;
  private state: DesktopUpdateState | null = null;

  constructor(private readonly deps: DesktopUpdaterDependencies) {
    const { updater } = deps;
    updater.on('checking-for-update', () => this.setState({ type: 'checking' }));
    updater.on('update-available', (info) => this.setState({ type: 'available', version: this.readVersion(info?.version) }));
    updater.on('download-progress', (progress) => {
      const percent = Number(progress?.percent);
      this.setState({ type: 'downloading', percent: Number.isFinite(percent) ? Math.round(Math.max(0, Math.min(100, percent))) : 0 });
    });
    updater.on('update-downloaded', (info) => {
      this.downloadedVersion = this.readVersion(info?.version);
      this.setState({ type: 'downloaded', version: this.downloadedVersion });
    });
    updater.on('update-not-available', () => this.setState({ type: 'not-available' }));
    updater.on('error', () => {
      if (this.installing) {
        this.installing = false;
        this.installErrorDuringCall = true;
        if (this.downloadedVersion) this.setState({ type: 'downloaded', version: this.downloadedVersion });
        return;
      }
      this.setState({ type: 'error', message: UPDATE_ERROR_MESSAGE });
    });
  }

  get currentState(): DesktopUpdateState | null { return this.state; }
  get hasDownloadedUpdate(): boolean { return this.downloadedVersion !== null; }
  get isInstalling(): boolean { return this.installing; }

  async checkForUpdates(): Promise<void> {
    if (this.checkInFlight) return;
    this.checkInFlight = true;
    this.setState({ type: 'checking' });
    try {
      const result = await this.deps.updater.checkForUpdates() as { downloadPromise?: unknown } | null;
      if (result === null) {
        this.setState({ type: 'error', message: UPDATE_UNSUPPORTED_MESSAGE });
        return;
      }
      const downloadPromise = result?.downloadPromise;
      if (downloadPromise && typeof (downloadPromise as PromiseLike<unknown>).then === 'function') {
        void Promise.resolve(downloadPromise).catch(() => {
          this.setState({ type: 'error', message: UPDATE_ERROR_MESSAGE });
        });
      }
    } catch {
      this.setState({ type: 'error', message: UPDATE_ERROR_MESSAGE });
    } finally {
      this.checkInFlight = false;
    }
  }

  async installDownloadedUpdate(): Promise<boolean> {
    const version = this.downloadedVersion;
    if (!version || this.installing) return false;
    let clockedIn: boolean;
    try {
      const clockStatus = await this.deps.getClockedIn();
      if (typeof clockStatus !== 'boolean') throw new Error('Clock status unavailable');
      clockedIn = clockStatus;
    } catch {
      this.setState({ type: 'deferred', version, reason: 'status-unavailable' });
      return false;
    }
    if (clockedIn) {
      this.setState({ type: 'deferred', version, reason: 'clocked-in' });
      return false;
    }

    this.installing = true;
    this.installErrorDuringCall = false;
    try {
      this.deps.updater.quitAndInstall();
      return !this.installErrorDuringCall;
    } catch {
      this.installing = false;
      this.setState({ type: 'downloaded', version });
      return false;
    }
  }

  private readVersion(value: unknown): string {
    return typeof value === 'string' && /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(value) ? value : 'new version';
  }

  private setState(state: DesktopUpdateState): void {
    this.state = state;
    this.deps.publish(state);
  }
}

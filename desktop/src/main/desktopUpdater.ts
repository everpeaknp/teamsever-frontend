export type DesktopUpdateState =
  | { type: 'checking' }
  | { type: 'available'; version: string }
  | { type: 'downloading'; percent: number }
  | { type: 'downloaded'; version: string }
  | { type: 'not-available' }
  | { type: 'deferred'; version: string; reason: 'clocked-in' | 'status-unavailable' }
  | { type: 'error'; message: string };

type UpdateEvent = 'checking-for-update' | 'update-available' | 'download-progress' | 'update-downloaded' | 'update-not-available' | 'error';
type UpdateListener = (value?: any) => void;

interface UpdaterAdapter {
  on: (event: UpdateEvent, listener: UpdateListener) => unknown;
  checkForUpdates: () => Promise<unknown>;
  quitAndInstall: () => void;
}

interface DesktopUpdaterDependencies {
  updater: UpdaterAdapter;
  getClockedIn: () => Promise<boolean>;
  publish: (state: DesktopUpdateState) => void;
}

const UPDATE_ERROR_MESSAGE = 'Could not check for desktop updates. You can download the latest version manually.';

export class DesktopUpdaterController {
  private downloadedVersion: string | null = null;
  private checkInFlight = false;
  private installing = false;
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
    updater.on('error', () => this.setState({ type: 'error', message: UPDATE_ERROR_MESSAGE }));
  }

  get currentState(): DesktopUpdateState | null { return this.state; }
  get hasDownloadedUpdate(): boolean { return this.downloadedVersion !== null; }
  get isInstalling(): boolean { return this.installing; }

  async checkForUpdates(): Promise<void> {
    if (this.checkInFlight) return;
    this.checkInFlight = true;
    this.setState({ type: 'checking' });
    try {
      await this.deps.updater.checkForUpdates();
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
      clockedIn = await this.deps.getClockedIn();
    } catch {
      this.setState({ type: 'deferred', version, reason: 'status-unavailable' });
      return false;
    }
    if (clockedIn) {
      this.setState({ type: 'deferred', version, reason: 'clocked-in' });
      return false;
    }

    this.installing = true;
    this.deps.updater.quitAndInstall();
    return true;
  }

  private readVersion(value: unknown): string {
    return typeof value === 'string' && /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(value) ? value : 'new version';
  }

  private setState(state: DesktopUpdateState): void {
    this.state = state;
    this.deps.publish(state);
  }
}

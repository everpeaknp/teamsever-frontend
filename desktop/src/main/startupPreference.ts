export type LoginItemSettings = { openAtLogin: boolean; enabled: boolean };

export type StartupPreferenceOptions = {
  platform: string;
  isPackaged: boolean;
  read: () => Promise<boolean | undefined>;
  write: (enabled: boolean) => Promise<void>;
  setLoginItem: (settings: LoginItemSettings) => void;
};

export async function initializeStartupPreference(options: StartupPreferenceOptions): Promise<{ supported: boolean; enabled: boolean }> {
  if (options.platform !== 'win32' || !options.isPackaged) return { supported: false, enabled: false };

  const saved = await options.read();
  const enabled = saved ?? true;
  if (saved === undefined) {
    options.setLoginItem({ openAtLogin: true, enabled: true });
    await options.write(true);
  }
  return { supported: true, enabled };
}

export async function updateStartupPreference(enabled: boolean, options: StartupPreferenceOptions): Promise<{ supported: boolean; enabled: boolean }> {
  if (options.platform !== 'win32' || !options.isPackaged) return { supported: false, enabled: false };
  options.setLoginItem({ openAtLogin: enabled, enabled: true });
  await options.write(enabled);
  return { supported: true, enabled };
}

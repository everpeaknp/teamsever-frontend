import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import { normalizeAppId } from './tracker';

const execFileAsync = promisify(execFile);
export const windowsProcessNameScript = [
  'Add-Type -TypeDefinition \'using System; using System.Runtime.InteropServices; public static class ForegroundProcess { [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow(); [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId); }\';',
  '$processId = 0; [void][ForegroundProcess]::GetWindowThreadProcessId([ForegroundProcess]::GetForegroundWindow(), [ref]$processId);',
  'if ($processId -gt 0) { [Diagnostics.Process]::GetProcessById($processId).ProcessName }',
].join(' ');

export async function getForegroundProcessName(platform = process.platform): Promise<string | null> {
  if (platform === 'win32') {
    const { stdout } = await execFileAsync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', windowsProcessNameScript], { timeout: 4000, windowsHide: true });
    return normalizeAppId(stdout.trim());
  }
  if (platform === 'linux') {
    const { stdout } = await execFileAsync('xdotool', ['getactivewindow', 'getwindowpid'], { timeout: 2000 });
    const pid = stdout.trim();
    if (!/^\d{1,10}$/.test(pid)) return null;
    const processName = (await fs.readFile(`/proc/${pid}/comm`, 'utf8')).trim();
    return normalizeAppId(processName);
  }
  return null;
}

export async function foregroundAppSupport(platform = process.platform, wayland = false): Promise<{ supported: boolean; reason?: string }> {
  if (platform === 'win32') return { supported: true };
  if (platform !== 'linux') return { supported: false, reason: 'Foreground app detection is supported on Windows and Linux/X11.' };
  if (wayland) return { supported: false, reason: 'Wayland prevents apps from identifying the foreground application. Clocking still works; app presence is unavailable in this session.' };
  try {
    await execFileAsync('xdotool', ['getactivewindow'], { timeout: 1500 });
    return { supported: true };
  } catch {
    return { supported: false, reason: 'Linux app presence requires an X11 session with xdotool installed. Clocking still works.' };
  }
}

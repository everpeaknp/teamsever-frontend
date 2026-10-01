# TeamsEver Desktop

This Electron app opens TeamsEver and adds trusted desktop clocking plus opt-in foreground-app presence. For local development it opens `http://localhost:3000`; start both web frontend and backend first, then run this package:

Use Node.js 22.12 or newer for desktop development (Electron 44's supported engine range).

```sh
cd desktop
npm install
npm run dev
```

Use Node.js 22.12 or newer. Set `TEAMSEVER_API_URL` to the backend origin when it is not `http://localhost:5000`.

The remote web content runs with Node integration disabled, context isolation and sandboxing enabled, and navigation restricted to the configured origin. Only HTTPS links may open in the system browser. The app grants geolocation only to the configured TeamsEver origin; all other Chromium permissions are denied. A narrow preload bridge handles device credentials and clock actions.

After sign-in, the attendance card connects this installation to the signed-in user. The backend stores only a one-way hash of the device credential; Electron encrypts the credential with the operating system key store. The user can disconnect this installation or revoke other installations from the attendance card. Clock-in/out calls are checked by the same backend workspace permissions and location policy as web clocking. A desktop-started shift can only be clocked out by the same trusted installation.

Foreground app presence runs only when monitoring consent is enabled for a shift started by that desktop device. It reports the foreground process name and active/AFK state; it does not send or store window titles, URLs, screenshots, keystrokes, clipboard contents, or document text. When the tracker cannot read a heartbeat, the server records a presence gap for review; the gap never changes clock times. This reports which application was in front, not keyboard/mouse activity, and the app identity is not proof against a compromised machine.

Windows uses the foreground window's owning process name. Linux currently supports X11 sessions with `xdotool`; Wayland intentionally reports app presence as unavailable because it prevents foreground-app identification. Clock-in/out still works on Wayland.

## Build installers locally

Set `TEAMSEVER_WEB_URL` and `TEAMSEVER_API_URL` to the deployed TeamsEver HTTPS origins before packaging:

```sh
cd desktop
TEAMSEVER_WEB_URL=https://teamsever.everacy.com TEAMSEVER_API_URL=https://teamseverbackend.everacy.com npm run dist:linux
TEAMSEVER_WEB_URL=https://teamsever.everacy.com TEAMSEVER_API_URL=https://teamseverbackend.everacy.com npm run dist:win
```

The Linux build creates `release/TeamsEver.AppImage` and `release/latest-linux.yml`. The Windows build creates `release/TeamsEver-Setup.exe` and `release/latest.yml`. Build Windows installers on Windows and Linux packages on Linux.

## Automatic desktop updates

Packaged Windows (NSIS) and Linux (AppImage) installations check for a stable GitHub Release when the app starts and every six hours while it is open. A new installer downloads in the background. TeamsEver shows a toast when it is ready; the user can restart then or wait. The installer is applied only after the app verifies that the user is clocked out. If clock status cannot be verified, installation is deferred. A failed update check never changes attendance, and the toast offers the direct latest installer as a fallback.

The app downloads published releases, not arbitrary Git pushes or web deployments. Updating the hosted website changes what Electron displays when it reloads; changes to Electron's main process, preload, or native tracker require a new tagged desktop release. The release must include the platform installer and its updater manifest (`latest.yml` for Windows, `latest-linux.yml` for Linux). The release workflow validates both before publication.

## GitHub Releases

The `Desktop Release` GitHub Actions workflow runs when a `v*` tag points to a commit already merged into `main`. It validates the tag against `desktop/package.json`, builds both platform installers and updater manifests, then publishes a GitHub Release with all assets attached. No signing certificate is configured yet, so Windows may show SmartScreen and Linux packages are unsigned.

Before tagging a release, add repository Actions variables `TEAMSEVER_WEB_URL` and `TEAMSEVER_API_URL` in **Settings → Secrets and variables → Actions → Variables**. The workflow fails early if either is missing. To release, merge the tested branch to `main`, create a version tag matching `desktop/package.json` on that merge commit, and push the tag. The navbar download icon downloads the matching Windows installer or Linux AppImage directly from the latest published release without showing GitHub to users.

The next updater-enabled release is a one-time manual installation for users already running an older installer that has no updater code. After they install that version, future published desktop releases can update through the app. Windows may show SmartScreen and Linux packages are unsigned until signing is configured.

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

Foreground app presence is off until the user opts in. When enabled, the app reports the foreground process name once per minute during a shift started by that desktop device. It does not send or store window titles, URLs, screenshots, keystrokes, clipboard contents, or document text. When the tracker cannot read a heartbeat, the server records a presence gap for review; the gap never changes clock times. This reports which application was in front, not keyboard/mouse activity or an AFK score, and the app identity is not proof against a compromised machine.

Windows uses the foreground window's owning process name. Linux currently supports X11 sessions with `xdotool`; Wayland intentionally reports app presence as unavailable because it prevents foreground-app identification. Clock-in/out still works on Wayland.

## Build installers locally

Set `TEAMSEVER_WEB_URL` and `TEAMSEVER_API_URL` to the deployed TeamsEver HTTPS origins before packaging:

```sh
cd desktop
TEAMSEVER_WEB_URL=https://teamsever.everacy.com TEAMSEVER_API_URL=https://teamseverbackend.everacy.com npm run dist:linux
TEAMSEVER_WEB_URL=https://teamsever.everacy.com TEAMSEVER_API_URL=https://teamseverbackend.everacy.com npm run dist:win
```

The Linux build creates `release/TeamsEver.AppImage`. The Windows build creates `release/TeamsEver-Setup.exe`. Build Windows installers on Windows and Linux packages on Linux.

## GitHub Releases

The `Desktop Release` GitHub Actions workflow runs when a `v*` tag points to a commit already merged into `main`. It builds Windows and Linux installers, then creates a **draft** GitHub Release with both assets attached. Review the draft and publish it in GitHub when ready. No signing certificate is configured yet, so Windows may show SmartScreen and Linux packages are unsigned.

Before tagging a release, add repository Actions variables `TEAMSEVER_WEB_URL` and `TEAMSEVER_API_URL` in **Settings → Secrets and variables → Actions → Variables**. The workflow fails early if either is missing. To release, merge the tested branch to `main`, create a version tag matching `desktop/package.json` (currently `v0.1.2`) on that merge commit, and push the tag. The navbar download icon downloads the matching Windows installer or Linux AppImage directly when that asset exists in the latest published release. It stays unavailable when no matching installer exists; it does not send users to the GitHub release page.

The workflow creates a draft release only. It does not publish, sign, or auto-update installers. Windows may show SmartScreen and Linux packages are unsigned until signing is configured.

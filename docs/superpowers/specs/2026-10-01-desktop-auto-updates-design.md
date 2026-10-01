# TeamsEver Desktop automatic updates design

## Goal

Make desktop code updates easy for normal users. The installed app should find and install published updates without requiring users to revisit the website or manually reinstall each release. Updates must come only from the existing official GitHub Releases for `everpeaknp/teamsever-frontend`.

Web UI continues loading from the hosted TeamsEver site. Automatic desktop updates cover the packaged Electron main, preload, and renderer code, including tracking and security fixes.

## User experience

- On app startup and periodically while running, check for a newer published release.
- Download available updates in the background and show concise progress/status through the TeamsEver desktop UI.
- When ready, show an in-app toast with **Restart to update** and **Later** actions. Do not interrupt clocking or force a restart.
- If checking or downloading fails, keep the current app usable and show a **Download latest version** fallback that opens the official release asset for the current platform.
- Apply a downloaded update only when the user chooses restart or exits the app; never restart during an active clocked-in shift. If clocked in, defer installation and explain that the user should clock out first.
- Unsupported packages/platforms show the manual download fallback. The supported artifacts remain Windows NSIS x64 and Linux AppImage x64.

## Architecture

Configure `electron-builder` GitHub publishing metadata for the existing public repository and use `electron-updater` in Electron's main process. The release workflow must attach the platform installers and generated update metadata (`latest.yml` for Windows and `latest-linux.yml` for AppImage, plus any generated blockmaps) to the same published release. The workflow remains tag-triggered and retains its existing main-branch ancestry check.

The main process owns update checks, downloads, and installation. It reports typed update states to the renderer over the existing context-isolated preload bridge. A global desktop-only UI listener displays progress, errors, and the ready-to-restart toast. Update controls must not accept arbitrary URLs from the renderer; fallback URLs are constructed for the fixed official repository/release and platform artifact.

Clock state is already available through the trusted desktop attendance status API. The app defers `quitAndInstall` while that API reports a running shift, resumes eligibility after clock-out, and never alters attendance state. Update service failures are non-fatal and logged without exposing credentials.

## Validation

- Unit-test update-state mapping and the rule that installation is deferred for a running shift.
- Test the preload/main IPC boundary and fallback platform asset selection without making live releases.
- Validate that release packaging emits the expected manifest and artifacts for both supported targets.
- Run desktop type checks and test suite plus frontend production build. Do not publish or push during this task.

## Out of scope

- Mobile updates, a self-hosted update server, auto-updating Debian packages, mandatory restart, or changing how the hosted web UI deploys.
- Creating a release or changing the current published release.

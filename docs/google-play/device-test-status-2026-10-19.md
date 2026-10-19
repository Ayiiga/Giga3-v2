# Device test status — 2026-10-19

## Goal

Install `app-debug.apk` on an Android emulator/device and exercise TWA launch, navigation, auth, back, external links, and offline/network failure.

## Attempts (Cloud Agent)

| Attempt | Setup | Result |
|---------|--------|--------|
| 1 | AVD API 34 + KVM denied | Emulator refused to start (no `/dev/kvm` group) |
| 2 | Added user to `kvm` group | QEMU started; `adb` showed `emulator-5554 offline` for >10 min |
| 3 | Memory pressure (4× `next-server` ~9 GB RSS) | Same offline state |
| 4 | Freed orphaned Next.js processes (~14 GB free), wipe-data, 1536M AVD | QEMU listening on `127.0.0.1:5554` / `5555`; `adb connect` still **`offline`**; `sys.boot_completed` never became `1` after >15 min |

## Root cause (best evidence)

1. **Primary:** Guest Android never finishes booting far enough for `adbd` to leave the offline state. Host ports are open; `adb devices` lists the emulator as offline. This is not a missing APK issue.
2. **Contributing (earlier):** Host RAM exhaustion from leftover Next.js/Playwright processes; KVM permission missing until `gpasswd -a ubuntu kvm`.
3. **Environment:** No physical USB Android device attached (`adb devices` empty aside from the stuck emulator).

## What was *not* claimed

- No successful `adb install`
- No TWA verification on-device
- No auth / navigation / back / offline UI results
- `aapt` / `jarsigner` checks are packaging checks only

## How to complete testing (owner)

```bash
# On a machine with a working emulator or USB device:
adb devices   # must show "device", not offline
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb shell am start -n com.giga3ai.app/.LauncherActivity
```

For **fullscreen TWA** (no URL bar), production Digital Asset Links must include the SHA-256 of the certificate that signed the installed build (debug keystore for debug APK; Play App Signing cert for Play builds).

Checklist: `docs/google-play/internal-testing-checklist.md`

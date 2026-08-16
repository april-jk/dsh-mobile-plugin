# DSH Mobile Remote Companion

Installable DSH bundle and computer-side Companion for accessing DeepSeek Harness through a Relay.

## Install into DSH

From this checkout:

```bash
npm install
npm run build
dsh plugin --profile web add "/absolute/path/to/dsh-plugin"
dsh web
```

If the previous development package is already present in this DSH profile, remove it before adding the renamed bundle:

```bash
dsh plugin --profile web remove dsh-mobile-remote-companion
dsh plugin --profile web add "/absolute/path/to/dsh-plugin"
```

The first `dsh web` start prints a six-digit code and QR code. Log in on the mobile app and claim it once. Later DSH starts reuse the credential stored in `~/.dsh-remote/config.json` with mode `0600`.

The bundle pins DSH's workspace selector to the in-browser directory picker, so remote browsers can choose a directory on the computer without opening a native Finder dialog.

The standalone fallback command is `dsh-mobile`; commands are `start`, `pair`, `status`, and `unpair`.

> Publishing note: the unscoped npm name `dsh-mobile` is currently occupied. Do not install that registry package unless its ownership is confirmed. Local-path installation works as shown above; public publication requires control of that package or an organization scope such as `@your-org/dsh-mobile`.

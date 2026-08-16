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

After publication, install with:

```bash
dsh plugin --profile web add dsh-mobile-remote-companion
```

The first `dsh web` start prints a six-digit code and QR code. Log in on the mobile app and claim it once. Later DSH starts reuse the credential stored in `~/.dsh-remote/config.json` with mode `0600`.

The bundle pins DSH's workspace selector to the in-browser directory picker, so remote browsers can choose a directory on the computer without opening a native Finder dialog.

The standalone fallback command is `dsh-mobile-remote`; commands are `start`, `pair`, `status`, and `unpair`.

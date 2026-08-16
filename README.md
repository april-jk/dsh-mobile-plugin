# dsh-remote

Computer-side companion for accessing DeepSeek Harness through a DSH Relay.

```bash
npm install
npm run build
DSH_RELAY=http://127.0.0.1:8787 node dist/cli.js start
```

The first start prints a six-digit code and QR code. Claim it from the mobile app, then the Companion stores its credential in `~/.dsh-remote/config.json` with mode `0600` and connects automatically on future starts.

Commands: `start`, `pair`, `status`, `unpair`.

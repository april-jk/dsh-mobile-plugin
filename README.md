# DSH Mobile Remote

[English](README.md) | [简体中文](README.zh-CN.md)

Access a local DeepSeek Harness Web UI from a paired phone through an outbound-only Relay connection.

> **Community project:** this is an unofficial project, independently developed and maintained by the community. It is not reviewed, endorsed, or supported by DeepSeek.

**Complete project, signed Android APK, and private Relay package:** [DSH Mobile Suite](https://github.com/april-jk/dsh-mobile-suite)

![DSH Mobile Remote settings inside DeepSeek Harness](docs/images/remote-access-settings.png)

## Compatibility

The current release is tested against `@deepseek-ai/dsh@0.1.0-rc.6`. DeepSeek Harness is in Developer Preview and may introduce breaking plugin changes. CI pins this version so compatibility changes are explicit.

Requirements:

- Node.js 18 or newer
- DeepSeek Harness `0.1.0-rc.6`
- A phone running the companion DSH Mobile app
- HTTPS access to the configured Relay

## Install

The immutable GitHub tag is the recommended public installation path. It requires neither a global DSH installation nor a local plugin directory:

```bash
npx @deepseek-ai/dsh plugin --profile web add "github:april-jk/dsh-mobile-plugin#v0.1.4"
npx @deepseek-ai/dsh web
```

Each GitHub Release also contains a prebuilt `.tgz`. DSH can install it directly from its release URL without a manual download or local path:

```bash
npx @deepseek-ai/dsh plugin --profile web add "https://github.com/april-jk/dsh-mobile-plugin/releases/download/v0.1.4/april-jk-dsh-mobile-0.1.4.tgz"
npx @deepseek-ai/dsh web
```

The package metadata is ready for npm, but `@april-jk/dsh-mobile` is not yet published to the public npm registry. After its first npm release, the registry command will be:

```bash
npx @deepseek-ai/dsh plugin --profile web add "@april-jk/dsh-mobile@<published-version>"
npx @deepseek-ai/dsh web
```

To uninstall:

```bash
npx @deepseek-ai/dsh plugin --profile web remove @april-jk/dsh-mobile
```

For local development, clone the repository and let the shell supply its current path:

```bash
git clone https://github.com/april-jk/dsh-mobile-plugin.git
cd dsh-mobile-plugin
npm ci
npm run build
npx @deepseek-ai/dsh plugin --profile web add "$PWD"
npx @deepseek-ai/dsh web
```

## Pair a phone

Open **Settings > Remote Access** in the local DSH Web UI and scan the QR code with iPhone Camera or the mobile app. New QR codes open the Relay browser client directly; their one-time code and end-to-end encryption key stay in the URL fragment and are not sent in the page request. A six-digit code by itself is not sufficient. Later DSH starts reuse the device credential stored in `~/.dsh-remote/config.json` with owner-only permissions.

The same settings page can remove the pairing. Removal revokes the Relay device credential, disconnects active remote access, and clears the local credential only after the Relay confirms the operation. The `dsh-mobile unpair` command provides the same behavior when the Web UI is unavailable.

## Network and data behavior

- DSH remains bound to `127.0.0.1:3080`; the plugin never creates a public listener.
- The computer opens an outbound WSS connection to `https://relay.dshmobile.online` by default. Set `DSH_RELAY` before starting DSH to use another compatible Relay.
- HTTP, SSE, and WebSocket payloads are end-to-end encrypted between the mobile app and this Companion with AES-256-GCM. The Relay only forwards sealed frames; TLS additionally protects connection metadata in transit.
- Version 0.1.4 uses a QR-provisioned pre-shared key and does not provide forward secrecy. Unpair a device and pair it again if the QR code or either endpoint may have been compromised.
- The plugin stores its Relay device token locally in `~/.dsh-remote/config.json` and never sends that token to the mobile client.
- The Relay records bounded phone metadata and access times for the access timeline. It does not persist DSH request or response bodies.
- Installing this bundle disables DSH's native directory picker and enables the browser-based picker so remote browsers can choose a directory without opening Finder or another native dialog.

For a private Relay, start DSH with the same HTTPS origin configured in the mobile app:

```bash
DSH_RELAY=https://relay.example.com npx @deepseek-ai/dsh web
```

## Standalone commands

The fallback CLI is installed as `dsh-mobile` and supports `start`, `pair`, `status`, and `unpair`. Normal users should manage pairing through the DSH settings page.

## Development

```bash
npm ci
npm run build
npm test
npm pack --dry-run
```

`dist/` is committed intentionally so GitHub installs have a complete plugin without lifecycle scripts. CI runs build, tests, bundle freshness checks, and an npm pack check on Node.js 18, 20, and 22. It also verifies installation against the pinned DSH Developer Preview.

To publish a release, update `package.json` and `package-lock.json`, rebuild `dist/`, and push a tag that exactly matches `v<package.version>`. The tag workflow repeats all release checks, then creates an immutable GitHub Release with the prebuilt npm tarball and `SHA256SUMS`. A rerun succeeds only when the existing asset set and both asset contents are identical; it never overwrites an existing asset. A mismatched tag fails before any artifact is uploaded.

npm publishing is disabled by default. Repository maintainers can opt in by setting the Actions variable `NPM_PUBLISH_ENABLED` to `true` and adding an `NPM_TOKEN` Actions secret with publish access to `@april-jk/dsh-mobile`. With either setting absent, GitHub Releases continue normally and no npm publish is attempted.

## Community discovery

The repository should use the `dsh-plugin` and `deepseek-harness` GitHub topics. A single-project post for the official plugin Discussion category can use:

`DSH | DSH Mobile Remote | Access your local DSH Web UI from a paired phone`

A ready-to-post project description is maintained in [`docs/SHOW-YOUR-PLUGIN.md`](docs/SHOW-YOUR-PLUGIN.md).

## License

[MIT](LICENSE)

# DSH | DSH Mobile Remote | Access your local DSH Web UI from a paired phone

> **Unofficial community project:** independently developed and maintained. This project is not reviewed, endorsed, or supported by DeepSeek.

Project: https://github.com/april-jk/dsh-mobile-suite

Plugin source: https://github.com/april-jk/dsh-mobile-plugin

Latest signed APK and deployment packages: https://github.com/april-jk/dsh-mobile-suite/releases/latest

DSH Mobile Remote adds a **Remote Access** section to the DeepSeek Harness Web UI. A user can pair a phone by scanning the version 2 QR code, open the computer's local DSH UI through an outbound-only Relay connection, submit normal DSH tasks, review phone access history, and revoke the pairing from the computer.

![Remote Access settings](images/remote-access-settings.png)

## DSH integration

- Exports a Cordis `apply(ctx)` plugin and declares `webStartup` plus `webServer` injection.
- Ships a DSH bundle patch through `dsh.bundle.patch`.
- Registers its settings client through the DSH client runtime.
- Keeps DSH on `127.0.0.1:3080`; the Companion opens only an outbound WSS connection.
- Replaces the native directory picker with DSH's browser picker for remote sessions.
- Tested against `@deepseek-ai/dsh@0.1.0-rc.6` on macOS and a clean Ubuntu GitHub Actions runner.

## Install

```bash
npx @deepseek-ai/dsh plugin --profile web add "github:april-jk/dsh-mobile-plugin#v0.1.5"
npx @deepseek-ai/dsh web
```

Open **Settings > Remote Access** to pair the phone.

## MVP security scope

Remote HTTP, SSE, and WebSocket payloads use AES-256-GCM end-to-end encryption between the mobile app and Companion, while HTTPS/WSS protects connection metadata in transit. The mobile client never receives the computer's device token. Version 0.1.5 uses a QR-provisioned pre-shared key without forward secrecy; this limitation and the Relay's bounded access metadata are documented in the repository.

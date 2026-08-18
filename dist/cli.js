#!/usr/bin/env node
import { Command } from "commander";
import qrcode from "qrcode-terminal";
import { loadConfig, saveConfig } from "./config.js";
import { pair } from "./pairing.js";
import { RelayClient } from "./relay-client.js";
import { RemoteAccessManager } from "./remote-access.js";
const program = new Command()
    .name("dsh-mobile")
    .description("Remote companion for DeepSeek Harness")
    .version("0.1.5");
program
    .command("pair")
    .description("Pair this computer with the mobile app")
    .action(async () => {
    const config = await loadConfig();
    await pair(config);
});
program
    .command("start")
    .description("Connect DSH to the Relay")
    .option("--dsh-port <port>", "DSH port", Number)
    .option("--relay <url>", "Relay base URL")
    .action(async (opts) => {
    let config = await loadConfig();
    config = {
        ...config,
        ...(opts.relay ? { relay: opts.relay } : {}),
        ...(opts.dshPort ? { dshPort: opts.dshPort } : {}),
    };
    await saveConfig(config);
    if (!config.deviceToken)
        config = await pair(config);
    const client = new RelayClient(config);
    await client.start();
    const stop = () => {
        client.stop();
        process.exit(0);
    };
    process.on("SIGINT", stop);
    process.on("SIGTERM", stop);
});
program
    .command("status")
    .description("Show local configuration and connectivity")
    .action(async () => {
    const config = await loadConfig();
    let dsh = false;
    try {
        dsh =
            (await fetch(`http://127.0.0.1:${config.dshPort}/`, {
                signal: AbortSignal.timeout(1500),
            })).status < 500;
    }
    catch { }
    console.log(JSON.stringify({
        paired: Boolean(config.deviceToken),
        deviceId: config.deviceId ?? null,
        deviceName: config.deviceName,
        relay: config.relay,
        dshPort: config.dshPort,
        dsh: dsh ? "online" : "offline",
    }, null, 2));
});
program
    .command("web")
    .description("Generate a browser access QR for an already paired computer")
    .action(async () => {
    const config = await loadConfig();
    const manager = new RemoteAccessManager(config);
    try {
        const access = manager.browserAccess();
        if (!access) {
            throw new Error("This computer is not paired yet; run dsh-mobile pair first.");
        }
        console.log(`\nBrowser access for ${access.deviceName}:\n`);
        qrcode.generate(access.qrPayload, { small: true }, (output) => console.log(output));
        console.log(`\nOpen this link in a signed-in browser:\n${access.qrPayload}\n`);
    }
    finally {
        manager.dispose();
    }
});
program
    .command("unpair")
    .description("Remove this computer's pairing and revoke its credential")
    .action(async () => {
    const config = await loadConfig();
    const manager = new RemoteAccessManager(config);
    try {
        await manager.removePairing();
        console.log("Pairing removed and device credential revoked.");
    }
    finally {
        manager.dispose();
    }
});
program.parseAsync().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});

import qrcode from "qrcode-terminal";
import { saveConfig } from "./config.js";
import { generateMasterKey } from "./e2ee.js";
import { pairingLink } from "./pair-link.js";
async function post(url, data) {
    const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(data),
    });
    return { status: response.status, data: (await response.json()) };
}
export async function pair(config) {
    const created = await post(`${config.relay}/pair/session`, {});
    if (created.status !== 201)
        throw new Error(`Relay rejected pairing session (${created.status})`);
    const { code, deviceId, deviceSecret } = created.data;
    const e2eeMasterKey = generateMasterKey();
    const qr = pairingLink(config.relay, code, e2eeMasterKey);
    console.log(`\nPairing code: ${code} (valid for 5 minutes)\n`);
    qrcode.generate(qr, { small: true }, (output) => console.log(output));
    console.log("Waiting for the mobile app to claim this code...");
    while (Date.now() < created.data.expiresAt) {
        const confirmed = await post(`${config.relay}/pair/confirm`, {
            deviceId,
            deviceSecret,
            deviceName: config.deviceName,
        });
        if (confirmed.status === 200) {
            const next = {
                ...config,
                deviceId,
                deviceSecret,
                deviceToken: confirmed.data.deviceToken,
                e2eeMasterKey,
            };
            await saveConfig(next);
            console.log(`Paired as ${config.deviceName}`);
            return next;
        }
        if (confirmed.status !== 202)
            throw new Error(`Pairing failed (${confirmed.status})`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    throw new Error("Pairing code expired");
}

import qrcode from "qrcode-terminal";
import { Config, saveConfig } from "./config.js";

async function post(url: string, data: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(data),
  });
  return { status: response.status, data: (await response.json()) as any };
}
export async function pair(config: Config): Promise<Config> {
  const created = await post(`${config.relay}/pair/session`, {});
  if (created.status !== 201)
    throw new Error(`Relay rejected pairing session (${created.status})`);
  const { code, deviceId, deviceSecret } = created.data;
  const qr = JSON.stringify({ v: 1, relay: config.relay, code });
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

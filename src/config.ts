import { chmod, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export type Config = {
  deviceId?: string;
  deviceSecret?: string;
  deviceToken?: string;
  deviceName: string;
  relay: string;
  dshPort: number;
};
const defaultPath = join(homedir(), ".dsh-remote", "config.json");
export function configPath() {
  return process.env.DSH_REMOTE_CONFIG ?? defaultPath;
}
export async function loadConfig(): Promise<Config> {
  try {
    return {
      ...defaults(),
      ...JSON.parse(await readFile(configPath(), "utf8")),
    };
  } catch {
    return defaults();
  }
}
export async function saveConfig(config: Config) {
  const path = configPath();
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temp = `${path}.tmp`;
  await writeFile(temp, `${JSON.stringify(config, null, 2)}\n`, {
    mode: 0o600,
  });
  await chmod(temp, 0o600);
  await rename(temp, path);
}
export function defaults(): Config {
  return {
    deviceName:
      process.env.DSH_DEVICE_NAME ?? `${process.env.USER ?? "User"}'s Computer`,
    relay: process.env.DSH_RELAY ?? "https://relay.dshmobile.online",
    dshPort: Number(process.env.DSH_PORT ?? 3080),
  };
}

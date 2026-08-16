import z from "@deepseek-ai/schemastery";
import { loadConfig, saveConfig } from "./config.js";
import { pair } from "./pairing.js";
import { RelayClient } from "./relay-client.js";

export const name = "dsh-mobile";
export const Config = z.object({
  relay: z.string().required(),
  dshPort: z.natural().max(65535).required(),
});

type PluginConfig = { relay: string; dshPort: number };
type PluginContext = {
  effect(
    callback: () => void | (() => void | Promise<void>),
    label?: string,
  ): void;
  logger: { info(message: string): void; warn(error: unknown): void };
};

export function apply(ctx: PluginContext, pluginConfig: PluginConfig) {
  ctx.effect(() => {
    let disposed = false;
    let client: RelayClient | undefined;

    void (async () => {
      try {
        let config = await loadConfig();
        config = {
          ...config,
          relay: pluginConfig.relay,
          dshPort: pluginConfig.dshPort,
        };
        await saveConfig(config);
        if (!config.deviceToken) config = await pair(config);
        if (disposed) return;
        client = new RelayClient(config);
        await client.start();
        ctx.logger.info(`DSH mobile remote connected through ${config.relay}`);
      } catch (error) {
        ctx.logger.warn(
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    })();

    return () => {
      disposed = true;
      client?.stop();
    };
  }, "dsh-mobile.lifecycle");
}

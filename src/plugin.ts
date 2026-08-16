import z from "@deepseek-ai/schemastery";
import { loadConfig, saveConfig } from "./config.js";
import { registerManagementRoutes, WebServer } from "./management.js";
import { RemoteAccessManager } from "./remote-access.js";

export const name = "dsh-mobile";
export const Config = z.object({
  relay: z.string().required(),
  dshPort: z.natural().max(65535).required(),
});

type PluginConfig = { relay: string; dshPort: number };
type PluginContext = {
  webServer: WebServer;
  effect(
    callback: () => void | (() => void | Promise<void>),
    label?: string,
  ): void;
  logger: { info(message: string): void; warn(error: unknown): void };
};

export function apply(ctx: PluginContext, pluginConfig: PluginConfig) {
  ctx.effect(() => {
    let disposed = false;
    let manager: RemoteAccessManager | undefined;
    let unregister: (() => void) | undefined;

    void (async () => {
      try {
        const config = {
          ...(await loadConfig()),
          relay: pluginConfig.relay,
          dshPort: pluginConfig.dshPort,
        };
        await saveConfig(config);
        if (disposed) return;
        manager = new RemoteAccessManager(config);
        unregister = registerManagementRoutes(ctx.webServer, manager);
        await manager.initialize();
        ctx.logger.info(
          config.deviceToken
            ? `DSH mobile remote connecting through ${config.relay}`
            : "DSH mobile remote is ready to pair in WebUI Settings",
        );
      } catch (error) {
        ctx.logger.warn(
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    })();

    return () => {
      disposed = true;
      unregister?.();
      manager?.dispose();
    };
  }, "dsh-mobile.lifecycle");
}

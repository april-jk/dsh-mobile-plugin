import { IncomingMessage, ServerResponse } from "node:http";
import { RemoteAccessManager } from "./remote-access.js";

export type WebServer = {
  register(route: {
    kind: "prefix";
    path: string;
    handler: (req: IncomingMessage, res: ServerResponse) => void | Promise<void>;
  }): () => void;
};

function json(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(body));
}

export function isRemoteRequest(req: IncomingMessage) {
  return req.headers["x-dsh-mobile-remote"] === "1";
}

export function createManagementHandler(manager: RemoteAccessManager) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    const path = new URL(req.url ?? "/", "http://127.0.0.1").pathname;
    try {
      if (req.method === "GET" && path === "/dsh-mobile/api/state") {
        return json(res, 200, {
          ...(await manager.state()),
          localActionsAllowed: !isRemoteRequest(req),
        });
      }
      if (
        isRemoteRequest(req) &&
        (req.method === "POST" || req.method === "DELETE")
      ) {
        return json(res, 403, { reason: "local_management_required" });
      }
      if (req.method === "POST" && path === "/dsh-mobile/api/pairing") {
        return json(res, 200, await manager.startPairing());
      }
      if (req.method === "DELETE" && path === "/dsh-mobile/api/pairing") {
        manager.cancelPairing();
        return json(res, 200, await manager.state());
      }
      return json(res, 404, { reason: "not_found" });
    } catch (error) {
      return json(res, 502, {
        reason: "relay_unavailable",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  };
}

export function registerManagementRoutes(
  webServer: WebServer,
  manager: RemoteAccessManager,
) {
  return webServer.register({
    kind: "prefix",
    path: "/dsh-mobile/api",
    handler: createManagementHandler(manager),
  });
}

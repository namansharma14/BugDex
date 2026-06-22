import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { handleApi } from "./api.js";
import { DASHBOARD_HTML } from "./asset.generated.js";

export interface DashboardServer {
  url: string;
  port: number;
  close(): Promise<void>;
}

export interface StartDashboardOptions {
  root: string;
  port?: number;
  host?: string;
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  if (chunks.length === 0) return undefined;
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    return undefined;
  }
}

async function handle(req: IncomingMessage, res: ServerResponse, root: string): Promise<void> {
  try {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (url.pathname.startsWith("/api/")) {
      const body = req.method === "POST" ? await readBody(req) : undefined;
      const result = await handleApi(root, req.method ?? "GET", url.pathname, body);
      res.writeHead(result.status, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify(result.body));
      return;
    }
    // Single-page app: serve the dashboard HTML for any non-API route.
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(DASHBOARD_HTML);
  } catch (err) {
    res.writeHead(500, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }));
  }
}

function listen(
  server: ReturnType<typeof createServer>,
  port: number,
  host: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const onError = (err: unknown): void => reject(err);
    server.once("error", onError);
    server.listen(port, host, () => {
      server.removeListener("error", onError);
      resolve();
    });
  });
}

/**
 * Start the dashboard server: a JSON API under `/api/*` and the SPA everywhere
 * else. If the requested port is taken, falls back to an OS-assigned one.
 */
export async function startDashboard(opts: StartDashboardOptions): Promise<DashboardServer> {
  const host = opts.host ?? "127.0.0.1";
  const desiredPort = opts.port ?? 4317;
  const server = createServer((req, res) => {
    void handle(req, res, opts.root);
  });

  try {
    await listen(server, desiredPort, host);
  } catch (err) {
    if (desiredPort !== 0 && (err as NodeJS.ErrnoException).code === "EADDRINUSE") {
      await listen(server, 0, host);
    } else {
      throw err;
    }
  }

  const address = server.address();
  const port = typeof address === "object" && address !== null ? address.port : desiredPort;
  return {
    url: `http://${host}:${port}`,
    port,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

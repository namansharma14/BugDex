import { startDashboard } from "../dashboard/index.js";

export interface DashboardCliOptions {
  port?: string;
  host?: string;
  dir?: string;
}

/** `bugdex dashboard` — serve the Pokédex web UI until interrupted. */
export async function runDashboard(opts: DashboardCliOptions): Promise<void> {
  const root = opts.dir ?? process.cwd();
  const port = opts.port !== undefined ? Number(opts.port) : undefined;
  if (port !== undefined && (!Number.isInteger(port) || port < 0 || port > 65535)) {
    throw new Error(`--port must be a valid port number (got "${opts.port}").`);
  }

  const server = await startDashboard({ root, port, host: opts.host });
  process.stdout.write(`BugDex dashboard → ${server.url}\n(press Ctrl+C to stop)\n`);

  await new Promise<void>((resolve) => {
    const stop = (): void => resolve();
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
  });
  await server.close();
}

// Cloudflare-only bridge. src/lib/env.server.ts validates process.env, but on
// Workers the database comes from the Hyperdrive binding, not a plain string.
// Imported first by cloudflare/worker.ts so it runs before any app module.
import { env } from "cloudflare:workers";

process.env.DATABASE_URL ??= env.HYPERDRIVE.connectionString;

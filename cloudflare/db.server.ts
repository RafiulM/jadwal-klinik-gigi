// Cloudflare replacement for src/db/index.server.ts (swapped in by an alias in
// vite.config.ts, so app code stays identical across deploys).
//
// Workers forbid reusing I/O objects across requests, so the app's global pg
// Pool would throw "Cannot perform I/O on behalf of a different request".
// Instead each request gets its own Pool on the Hyperdrive connection string;
// Hyperdrive does the real connection pooling to Supabase.
import { AsyncLocalStorage } from "node:async_hooks";
import { env } from "cloudflare:workers";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "../src/db/schema";

function connect(connectionString: string) {
  const pool = new Pool({
    connectionString,
    max: 5,
    connectionTimeoutMillis: 5000,
  });
  pool.on("error", () => {
    console.error("A PostgreSQL connection via Hyperdrive was lost.");
  });
  return drizzle(pool, { schema });
}

type Db = ReturnType<typeof connect>;

export const requestScope = new AsyncLocalStorage<{ db?: Db }>();

// Used only for property reads outside a request (e.g. adapter setup at module
// load). It never connects unless queried, which would be a bug anyway.
let detached: Db | undefined;

function current(): Db {
  const store = requestScope.getStore();
  if (!store) return (detached ??= connect(env.HYPERDRIVE.connectionString));
  return (store.db ??= connect(env.HYPERDRIVE.connectionString));
}

export const db = new Proxy({} as Db, {
  get(_target, prop) {
    const target = current();
    const value = Reflect.get(target, prop, target);
    return typeof value === "function" ? value.bind(target) : value;
  },
  has(_target, prop) {
    return Reflect.has(current(), prop);
  },
});

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

function connect(connectionString?: string) {
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

// Used only for metadata reads outside a request: Better Auth's drizzleAdapter
// reads db._.schema at module load. Reading the Hyperdrive binding there is a
// "Disallowed operation called within global scope", so this instance has no
// connection string and must never be queried.
let detached: Db | undefined;

function current(): Db {
  const store = requestScope.getStore();
  if (!store) return (detached ??= connect());
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

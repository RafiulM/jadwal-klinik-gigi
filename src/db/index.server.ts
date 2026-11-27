import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { env } from "@/lib/env.server";
import * as schema from "./schema";

// Connections per app process. Serverless hosts (Vercel) run many instances,
// so keep the default small there; a single long-running Node process (VPS)
// can raise it with DB_POOL_MAX. Postgres max_connections must have room.
const poolMax = Number(process.env.DB_POOL_MAX) || 5;

function connect() {
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: poolMax,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
  });
  pool.on("error", () => {
    console.error(
      "An idle PostgreSQL connection was lost. Check database availability.",
    );
  });
  return drizzle(pool, { schema });
}

// Prevent extra connection pools during development hot reloads.
const globalDb = globalThis as unknown as {
  starterPostgresDb?: ReturnType<typeof connect>;
};
export const db = globalDb.starterPostgresDb ?? connect();
if (process.env.NODE_ENV !== "production") globalDb.starterPostgresDb = db;

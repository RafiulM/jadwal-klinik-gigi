// Worker entry (wrangler.jsonc "main"). Wraps TanStack Start's default server
// entry so every request runs inside its own database scope.
import handler from "@tanstack/react-start/server-entry";
import { requestScope } from "./db.server";

type Env = { HYPERDRIVE: { connectionString: string } };

export default {
  fetch(request: Request, env: Env, ctx: unknown) {
    // src/lib/env.server.ts validates process.env.DATABASE_URL. On Workers the
    // database is the Hyperdrive binding, which may only be read inside a
    // handler, so fill it here before the app's server modules load.
    process.env.DATABASE_URL ??= env.HYPERDRIVE.connectionString;
    return requestScope.run({}, () =>
      (handler.fetch as (...args: unknown[]) => Promise<Response>)(
        request,
        env,
        ctx,
      ),
    );
  },
};

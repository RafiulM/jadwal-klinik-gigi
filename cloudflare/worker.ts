// Worker entry (wrangler.jsonc "main"). Wraps TanStack Start's default server
// entry so every request runs inside its own database scope.
import "./env";
import handler from "@tanstack/react-start/server-entry";
import { requestScope } from "./db.server";

export default {
  fetch(request: Request, env: unknown, ctx: unknown) {
    return requestScope.run({}, () =>
      (handler.fetch as (...args: unknown[]) => Promise<Response>)(
        request,
        env,
        ctx,
      ),
    );
  },
};

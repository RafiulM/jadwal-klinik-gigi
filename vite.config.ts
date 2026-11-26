import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import viteReact from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

// Cloudflare Workers build (branch deploy/cloudflare). Same app code as main;
// only the adapter differs: @cloudflare/vite-plugin instead of Nitro, plus a
// per-request database module (see cloudflare/db.server.ts).
export default defineConfig(({ command, mode }) => {
  // Server modules read process.env. In development Vite only exposes VITE_*
  // to the browser, so loading the whole file here never leaks a secret.
  if (command === "serve") {
    for (const [key, value] of Object.entries(loadEnv(mode, process.cwd(), "")))
      if (process.env[key] === undefined) process.env[key] = value;
  }
  return {
    server: { port: 3000 },
    resolve: {
      alias: [
        {
          // Workers can't share a pg Pool across requests; swap in the
          // request-scoped Hyperdrive client.
          find: /^@\/db\/index\.server$/,
          replacement: fileURLToPath(
            new URL("./cloudflare/db.server.ts", import.meta.url),
          ),
        },
      ],
    },
    plugins: [
      tailwindcss(),
      tsconfigPaths(),
      // Must come before tanstackStart().
      cloudflare({ viteEnvironment: { name: "ssr" } }),
      tanstackStart(),
      // React's plugin must come after Start's.
      viteReact(),
    ],
  };
});

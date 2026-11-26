import { defineConfig, loadEnv } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ command, mode }) => {
  // Server modules read process.env. In development Vite only exposes VITE_*
  // to the browser, so loading the whole file here never leaks a secret.
  if (command === "serve") {
    for (const [key, value] of Object.entries(loadEnv(mode, process.cwd(), "")))
      if (process.env[key] === undefined) process.env[key] = value;
  }
  return {
    server: { port: 3000 },
    // No fixed Nitro preset: locally and in Docker/Coolify it defaults to
    // node-server (.output/server/index.mjs, honors PORT and HOST); on Vercel
    // Nitro auto-detects the platform and emits the vercel preset instead.
    // Override with NITRO_PRESET if needed.
    plugins: [
      tailwindcss(),
      tsconfigPaths(),
      tanstackStart(),
      // Nitro is the deployment adapter; development uses Start's own server.
      command === "build" && nitro(),
      // React's plugin must come after Start's.
      viteReact(),
    ],
  };
});

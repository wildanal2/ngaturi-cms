import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";
import { imagesOptimizer } from "@vinext/cloudflare/images/images-optimizer";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    // Keep the Node/ioredis adapter out of the Cloudflare Worker module graph.
    alias: {
      "@/lib/redis/runtime": fileURLToPath(
        new URL("./src/lib/redis/runtime.worker.ts", import.meta.url),
      ),
    },
  },
  plugins: [
    vinext({
      images: { optimizer: imagesOptimizer() },
    }),
    cloudflare({
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
});

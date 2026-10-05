import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  return {
    plugins: [react(), tailwindcss()],
    optimizeDeps: {
      // Prebundle libraries used by lazy project views before the browser loads them.
      include: ["recharts", "@xyflow/react", "dagre"],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              return "vendor";
            }
          },
        },
      },
    },
    server: {
      host: "127.0.0.1",
      port: 3000,
      strictPort: true,
      proxy: {
        "/api": {
          target: env.VITE_BACKEND_URL || "http://127.0.0.1:8000",
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});

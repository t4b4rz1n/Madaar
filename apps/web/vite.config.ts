import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("recharts")) return "vendor-charts";
          if (id.includes("framer-motion")) return "vendor-motion";
          if (id.includes("iconsax-reactjs")) return "vendor-icons";
          if (id.includes("@tanstack")) return "vendor-query";
          if (id.includes("@dnd-kit")) return "vendor-dnd";
          if (id.includes("date-fns")) return "vendor-date";
          if (id.includes("axios") || id.includes("sonner")) return "vendor-network";
        },
      },
    },
  },
  server: {
    host: "127.0.0.1",
    port: 3000,
    proxy: {
      "/api": {
        target: process.env.VITE_BACKEND_URL || "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});

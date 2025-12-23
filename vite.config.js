import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        // target: "http://localhost:7777",
        target: "http://211.192.185.241:7000",
        changeOrigin: true,
      },
    },
  },
});

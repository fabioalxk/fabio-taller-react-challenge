import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "client",
  server: {
    port: 5173,
    proxy: {
      // Regex key ("^") so only real API paths proxy; a plain "/api" prefix
      // would also hijack the client's own "/api.ts" module request.
      "^/api/": "http://localhost:3000",
    },
  },
});

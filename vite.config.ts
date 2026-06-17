import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "client",
  server: {
    port: 5173,
    proxy: {
      // Use a regex (key starting with "^") so only real API paths are
      // proxied. A plain "/api" string is a prefix match and would also
      // hijack the client's own "/api.ts" module request, 404-ing the app.
      "^/api/": "http://localhost:3000",
    },
  },
});

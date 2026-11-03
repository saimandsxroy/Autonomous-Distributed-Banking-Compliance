import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to serve React SPA index.html on direct browser page navigation
const htmlBypass = (req) => {
  if (req.headers.accept && req.headers.accept.includes("text/html")) {
    return "/index.html";
  }
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8081",
        changeOrigin: true,
      },
      "/compliance": {
        target: "http://localhost:8081",
        changeOrigin: true,
        bypass: htmlBypass,
      },
      "/admin": {
        target: "http://localhost:8081",
        changeOrigin: true,
        bypass: htmlBypass,
      },
      "/journal": {
        target: "http://localhost:8081",
        changeOrigin: true,
        bypass: htmlBypass,
      },
      "/account": {
        target: "http://localhost:8081",
        changeOrigin: true,
        bypass: htmlBypass,
      },
      "/treasury": {
        target: "http://localhost:8081",
        changeOrigin: true,
        bypass: htmlBypass,
      },
      "/fx": {
        target: "http://localhost:8081",
        changeOrigin: true,
        bypass: htmlBypass,
      },
      "/batch": {
        target: "http://localhost:8081",
        changeOrigin: true,
        bypass: htmlBypass,
      },
      "/webhooks": {
        target: "http://localhost:8081",
        changeOrigin: true,
        bypass: htmlBypass,
      },
      "/auth": {
        target: "http://localhost:8081",
        changeOrigin: true,
        bypass: htmlBypass,
      },
      "/stream": {
        target: "http://localhost:8081",
        changeOrigin: true,
        bypass: htmlBypass,
      },
      "/hold": {
        target: "http://localhost:8081",
        changeOrigin: true,
        bypass: htmlBypass,
      },
      "/user": {
        target: "http://localhost:8081",
        changeOrigin: true,
        bypass: htmlBypass,
      },
      "/public": {
        target: "http://localhost:8081",
        changeOrigin: true,
        bypass: htmlBypass,
      },
      "/health-check": {
        target: "http://localhost:8081",
        changeOrigin: true,
        bypass: htmlBypass,
      },
    },
  },
});

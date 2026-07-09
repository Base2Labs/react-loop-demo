import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // Rom's reserved ngrok domain for reaching the dev server from a browser.
    allowedHosts: ["presanitary-lan-unabolishable.ngrok-free.dev"],
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "/rentmap/",
  server: {
    proxy: {
      "/amap": {
        target: "https://restapi.amap.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/amap/, ""),
      },
    },
  },
  plugins: [react(), tailwindcss()],
});

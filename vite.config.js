import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    root: "practice-udemy-figma-cource",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        login: resolve(__dirname, "html/login.html"),
        shop: resolve(__dirname, "html/shop.html"),
      },
    },
  },
  server: {
    port: 5173,
  },
});

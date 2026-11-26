import { defineConfig } from "vite";

export default defineConfig({
  base: process.env.GITHUB_PAGES === "1" ? "/peek-pigeon/" : "/",
  publicDir: "public"
});

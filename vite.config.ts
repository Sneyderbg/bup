import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import solid from "vite-plugin-solid";

export default defineConfig((env) => ({
  base: env.mode === "production" ? "/bup/" : "/",
  plugins: [solid(), tailwindcss()],
}));

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: './' にしておくと GitHub Pages のサブパス (https://ユーザー名.github.io/リポジトリ名/) でも動きます
export default defineConfig({
  plugins: [react()],
  base: "./",
});

import { defineConfig } from "vite";

export default defineConfig(async ({ command }) => {
  const plugins = [];
  if (command === "serve") {
    const basicSsl = (await import("@vitejs/plugin-basic-ssl")).default;
    plugins.push(basicSsl());
  }

  return {
    plugins,
    server: command === "serve"
      ? {
          https: true,
          host: "0.0.0.0",
          port: 5173,
          strictPort: true,
        }
      : {},
    resolve: {},
  };
});

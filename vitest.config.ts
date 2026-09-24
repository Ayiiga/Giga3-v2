import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
  esbuild: {
    jsx: "automatic",
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
    alias: {
      "@": path.resolve(__dirname, "web"),
      react: path.resolve(__dirname, "web/node_modules/react"),
      "react/jsx-runtime": path.resolve(__dirname, "web/node_modules/react/jsx-runtime.js"),
      "react/jsx-dev-runtime": path.resolve(
        __dirname,
        "web/node_modules/react/jsx-dev-runtime.js"
      ),
      "react-dom": path.resolve(__dirname, "web/node_modules/react-dom"),
      "react-dom/client": path.resolve(__dirname, "web/node_modules/react-dom/client.js"),
      "next/navigation": path.resolve(__dirname, "tests/web/mocks/navigation.tsx"),
      "next/link": path.resolve(__dirname, "tests/web/mocks/navigation.tsx"),
      "convex/researchCapabilities": path.resolve(
        __dirname,
        "convex/researchCapabilities.ts"
      ),
    },
  },
});

import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const alias = { "@": fileURLToPath(new URL("./src", import.meta.url)) };

// The site itself has no build step. This builds only the React "islands" into
// islands/, which is committed and served as-is by GitHub Pages:
//   npm run build   -> islands/pulsehr-gallery.js and .css
//   npm run demo    -> dev server for the shadcn demo in src/demos/
export default defineConfig(({ command }) =>
  command === "serve"
    ? {
        root: "src/demos",
        plugins: [react(), tailwindcss()],
        resolve: { alias },
      }
    : {
        plugins: [react(), tailwindcss()],
        resolve: { alias },
        publicDir: false,
        base: "./",
        build: {
          outDir: "islands",
          emptyOutDir: true,
          modulePreload: false,
          rollupOptions: {
            input: {
              "pulsehr-gallery": "src/islands/pulsehr-gallery.tsx",
              "flow-wave": "src/islands/flow-wave.ts",
            },
            output: {
              format: "es",
              entryFileNames: "[name].js",
              assetFileNames: "[name][extname]",
            },
          },
        },
      },
);

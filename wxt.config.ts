import react from '@vitejs/plugin-react';
import biomePlugin from 'vite-plugin-biome';
import { defineConfig } from 'wxt'

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    permissions: ["scripting", "storage", "runtime"],
    name: "LaTeX Copy",
    version: "0.2.6",
    description: "Make copying LaTeX effortless and efficient!",
    host_permissions: ["<all_urls>"],
  },
  vite: () => ({
    plugins: [
      react(),
      biomePlugin({
        mode: 'format',
        files: 'entrypoints/', // Format only JavaScript files in src
        applyFixes: true
      })
    ]
  })
})

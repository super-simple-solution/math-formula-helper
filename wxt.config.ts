import react from '@vitejs/plugin-react';
import { defineConfig } from 'wxt'

// See https://wxt.dev/api/config.html
export default defineConfig({
  manifest: {
    permissions: ["scripting", "storage"],
    name: "LaTeX Copy",
    version: "0.2.6",
    description: "Make copying LaTeX effortless and efficient!",
    host_permissions: ["<all_urls>"],
  },
  vite: () => ({
    plugins: [
      react(),
    ]
  })
})

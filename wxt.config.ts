import react from '@vitejs/plugin-react'
import biomePlugin from 'vite-plugin-biome'
import { defineConfig } from 'wxt'

export default defineConfig({
  manifest: {
    permissions: ['scripting', 'storage', 'sidePanel', 'tabs'],
    name: 'LaTeX Copy',
    version: '0.3.0',
    description: 'Make copying LaTeX effortless and efficient!',
    host_permissions: ['<all_urls>'],
    action: {
      default_title: 'Click to open panel',
    },
  },
  vite: () => ({
    plugins: [
      react(),
      biomePlugin({
        mode: 'format',
        files: 'entrypoints/', // Format only JavaScript files in src
        applyFixes: true,
      }),
    ],
  }),
})

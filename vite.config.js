import { resolve } from 'path'
import { defineConfig } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import eslintPlugin from 'vite-plugin-eslint'
import tailwind from 'tailwindcss'
import manifest from './manifest.json'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  output: {
    sourcemap: 'inline',
  },
  plugins: [crx({ manifest }), eslintPlugin()],
  css: {
    // https://github.com/vitejs/vite/discussions/8216
    modules: {
      scopeBehaviour: 'global',
    },
    postcss: {
      plugins: [tailwind()],
    },
  },
})

import { resolve } from 'path'
import { defineConfig } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import eslintPlugin from 'vite-plugin-eslint'
import tailwind from 'tailwindcss'
import manifest from './manifest.json'
import zipPack from 'vite-plugin-zip-pack'

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  output: {
    sourcemap: 'inline',
  },
  plugins: [crx({ manifest }), eslintPlugin(), zipPack({ outDir: './' })],
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

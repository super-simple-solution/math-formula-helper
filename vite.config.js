import path from 'node:path'
import { crx } from '@crxjs/vite-plugin'
import vue from '@vitejs/plugin-vue'
import tailwind from 'tailwindcss'
import { defineConfig } from 'vite'
import biomePlugin from 'vite-plugin-biome'
import zipPack from 'vite-plugin-zip-pack'
import manifest from './manifest.json'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  output: {
    sourcemap: 'inline',
  },
  plugins: [
    crx({ manifest }),
    biomePlugin({
      mode: 'check',
      files: '.',
      applyFixes: true,
      failOnError: true,
    }),
    vue(),
    AutoImport({
      // targets to transform
      include: [
        /\.[tj]sx?$/, // .ts, .tsx, .js, .jsx
        /\.vue$/,
        /\.vue\?vue/, // .vue
        /\.md$/, // .md
        /\.json$/, // .json
      ],
      // global imports to register
      imports: ['vue'],
      dts: './auto-imports.d.ts',
    }),
    zipPack({ outDir: './', outFileName: 'latex_copy.zip' }),
  ],
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

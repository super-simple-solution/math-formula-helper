import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
// import biomePlugin from 'vite-plugin-biome'
import { defineConfig } from 'wxt'
import path from 'node:path';
import { run } from '@wxt-dev/runner';

export default defineConfig({
  outDir: "dist",
  manifest: {
    permissions: ['scripting', 'storage', 'sidePanel', 'tabs'],
    name: 'LaTeX Copy',
    version: '0.3.1',
    description: 'Make copying LaTeX effortless and efficient!',
    host_permissions: ['<all_urls>'],
    action: {
      default_title: 'Click to open panel',
    },
  },
  // runner: {
  //   chromiumArgs: [
  //     // `--load-extension=C:\\Users\\Rin\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Extensions\\bpoadfkcbjbfhfodiogcnhhhpibjhbnh\\1.3.2_0`,
  //     `--user-data-dir=${path.join(process.cwd(), '.wxt', 'chrome-dev-profile')}`,
  //   ],
  //   keepProfileChanges: true,
  // },
  vite: () => ({
    plugins: [
      react(),
      tailwindcss(),
      // biomePlugin({
      //   mode: 'format',
      //   files: 'entrypoints', // Format only JavaScript files in src
      //   applyFixes: true,
      // }),
    ],
    // resolve: {
    //   alias: {
    //     "@": path.resolve(__dirname, "../*"),
    //   },
    // },
  }),
});
// await run({
//   extensionDir: 'C:\\Users\\Rin\\AppData\\Local\\Google\\Chrome\\User Data\\Default\\Extensions\\bpoadfkcbjbfhfodiogcnhhhpibjhbnh\\1.3.2_0',
//   // target: 'firefox',
// });

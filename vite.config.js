const { defineConfig } = require('vite');
const { svelte } = require('@sveltejs/vite-plugin-svelte');

module.exports = defineConfig(({ command }) => ({
  root: 'app',
  base: '/next/',
  publicDir: command === 'serve' ? '../public' : false,
  build: {
    outDir: '../public/next',
    emptyOutDir: true,
  },
  plugins: [svelte()],
}));

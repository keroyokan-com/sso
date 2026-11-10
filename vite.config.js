const { defineConfig } = require('vite');
const { svelte } = require('@sveltejs/vite-plugin-svelte');

module.exports = defineConfig(({ command }) => ({
  root: 'app',
  base: '/',
  publicDir: command === 'serve' ? '../public' : false,
  build: {
    outDir: '../public',
    emptyOutDir: false,
  },
  plugins: [svelte()],
}));

import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  outDir: 'lib',
  clean: true,
  sourcemap: false,
  // Runtime-only plugin loaded through `import('dsh-plugin-miliastra-toolbox')`;
  // no declarations to publish.
  dts: { enabled: false },
  // The package declares "type": "module", so plain .js output keeps the
  // entry at the conventional lib/index.js path.
  outExtensions() {
    return { js: '.js' }
  },
})

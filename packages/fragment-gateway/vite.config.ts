import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import path from 'node:path';

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true
    })
  ],
  build: {
    emptyOutDir: false,
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'FragmentGatewayLibrary',
      formats: ['es'],
      fileName: 'index'
    },
    rollupOptions: {
      external: ['fragment-elements', "src/reframing"],
    }
  },
  optimizeDeps: {
    exclude: ['fragment-elements'],
  },
});

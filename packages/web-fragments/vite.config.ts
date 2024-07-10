import path from 'node:path';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react(),
    dts({
      insertTypesEntry: true
    })
  ],
  build: {
    emptyOutDir: false,
    lib: {
      entry: {
        gateway: path.resolve(__dirname, 'src/gateway/index.ts'),
        elements: path.resolve(__dirname, 'src/elements/index.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM'
        }
      }
    }
  },
  resolve: {
    alias: {
      // cross-repo development only!
      // requires writable-dom checked out as a sibling to `reframed`
      // TODO: this is incorrect here and should be addressed as fragment-elements should be able to be standalone
      "writable-dom": path.resolve(__dirname, "../../../writable-dom/src/index.ts"),
    },
  },
});

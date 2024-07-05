import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import path, { resolve } from 'node:path';

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
        index: path.resolve(__dirname, 'src/index.ts'),
        outlet: path.resolve(__dirname, 'src/fragment-outlet.ts'),
      },
      name: 'FragmentLibrary',
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
      reframed: resolve(__dirname, "../../reframed/index.ts"),

      // cross-repo development only!
      // requires writable-dom checked out as a sibling to `reframed`
      // TODO: this is incorrect here and should be addressed as fragment-elements should be able to be standalone
      "writable-dom": resolve(__dirname, "../../../writable-dom/src/index.ts"),
    },
  },
});

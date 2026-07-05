import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import ts from 'typescript';

const fromRoot = (filePath: string) => {
  const pathname = decodeURIComponent(new URL(filePath, import.meta.url).pathname);

  return pathname.replace(/^\/([A-Za-z]:\/)/, '$1');
};

function typescriptTransformPlugin(): Plugin {
  return {
    name: 'typescript-transform',
    enforce: 'pre',
    transform(code, id) {
      const [filePath] = id.split('?');

      if (!/\.[cm]?tsx?$/.test(filePath) || filePath.indexOf('node_modules') !== -1) {
        return null;
      }

      const result = ts.transpileModule(code, {
        fileName: filePath,
        compilerOptions: {
          jsx: ts.JsxEmit.ReactJSX,
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2020,
          useDefineForClassFields: true,
        },
      });

      return {
        code: result.outputText,
        map: null,
      };
    },
  };
}

function disableEsbuildPlugin(): Plugin {
  return {
    name: 'disable-esbuild',
    config() {
      return {
        esbuild: false,
      };
    },
  };
}

export default defineConfig({
  base: '/unhyu-manager/',
  plugins: [typescriptTransformPlugin(), react(), disableEsbuildPlugin()],
  esbuild: false,
  build: {
    target: 'esnext',
    minify: false,
  },
  resolve: {
    alias: [
      {
        find: /^react$/,
        replacement: fromRoot('./node_modules/react/cjs/react.production.min.js'),
      },
      {
        find: /^react\/jsx-runtime$/,
        replacement: fromRoot('./node_modules/react/cjs/react-jsx-runtime.production.min.js'),
      },
      {
        find: /^react\/jsx-dev-runtime$/,
        replacement: fromRoot('./node_modules/react/cjs/react-jsx-dev-runtime.production.min.js'),
      },
      {
        find: /^react-dom$/,
        replacement: fromRoot('./node_modules/react-dom/cjs/react-dom.production.min.js'),
      },
      {
        find: /^react-dom\/client$/,
        replacement: fromRoot('./src/vendor/react-dom-client.js'),
      },
      {
        find: /^scheduler$/,
        replacement: fromRoot('./node_modules/scheduler/cjs/scheduler.production.min.js'),
      },
      {
        find: /^react-router$/,
        replacement: fromRoot('./node_modules/react-router/dist/react-router.production.min.js'),
      },
      {
        find: /^react-router-dom$/,
        replacement: fromRoot('./node_modules/react-router-dom/dist/react-router-dom.production.min.js'),
      },
    ],
    preserveSymlinks: true,
  }
});

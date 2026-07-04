import fs from 'node:fs/promises';
import path from 'node:path';
import ts from 'typescript';

const rootDir = process.cwd();
const srcDir = path.join(rootDir, 'src');
const distDir = path.join(rootDir, 'dist');
const publicDir = path.join(rootDir, 'public');

const sourceFiles = [
  'src/main.tsx',
  'src/App.tsx',
  'src/components/BottomNavigation.tsx',
  'src/components/DashboardCard.tsx',
  'src/pages/Home/HomePage.tsx',
  'src/pages/WorkInput/WorkInputPage.tsx',
  'src/pages/Calendar/CalendarPage.tsx',
  'src/pages/Statistics/StatisticsPage.tsx',
  'src/pages/Settings/SettingsPage.tsx',
  'src/engine/WorkCalculator.ts',
  'src/storage/LocalStorage.ts',
  'src/storage/SettingsStorage.ts',
  'src/types/dailyRecord.ts',
  'src/types/settings.ts',
  'src/types/work.ts',
  'src/utils/date.ts',
];

function toModuleId(filePath) {
  return filePath.replace(/\\/g, '/').replace(/\.(tsx|ts|jsx|js)$/, '');
}

async function copyDirectory(source, target) {
  try {
    await fs.cp(source, target, { recursive: true });
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

async function buildBundle() {
  const modules = [];

  for (const sourceFile of sourceFiles) {
    const absolutePath = path.join(rootDir, sourceFile);
    const source = await fs.readFile(absolutePath, 'utf8');
    const output = ts.transpileModule(source, {
      fileName: sourceFile,
      compilerOptions: {
        jsx: ts.JsxEmit.ReactJSX,
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        esModuleInterop: true,
      },
    });

    modules.push({
      id: toModuleId(sourceFile),
      code: output.outputText,
    });
  }

  const moduleEntries = modules
    .map((module) => {
      return `  "${module.id}": function(require, module, exports) {\n${module.code}\n  }`;
    })
    .join(',\n');

  return `(() => {
  const modules = {
${moduleEntries}
  };
  const cache = {};
  const jsxRuntime = {
    Fragment: React.Fragment,
    jsx(type, props, key) {
      return React.createElement(type, key === undefined ? props : { ...props, key });
    },
    jsxs(type, props, key) {
      return React.createElement(type, key === undefined ? props : { ...props, key });
    },
  };
  const reactModule = { __esModule: true, default: React, ...React };
  const reactDomClientModule = {
    __esModule: true,
    default: ReactDOM,
    createRoot: ReactDOM.createRoot,
  };

  function normalizeModuleId(id) {
    const parts = [];

    for (const part of id.split('/')) {
      if (!part || part === '.') continue;
      if (part === '..') {
        parts.pop();
        continue;
      }
      parts.push(part);
    }

    return parts.join('/').replace(/\\.(tsx|ts|jsx|js)$/, '');
  }

  function requireModule(id, fromId = '') {
    if (id === 'react') return reactModule;
    if (id === 'react-dom/client') return reactDomClientModule;
    if (id === 'react/jsx-runtime') return jsxRuntime;
    if (id === 'react-router-dom') return ReactRouterDOM;
    if (id.endsWith('.css')) return {};

    const resolvedId = id.startsWith('.')
      ? normalizeModuleId(fromId.split('/').slice(0, -1).concat(id.split('/')).join('/'))
      : id;

    if (cache[resolvedId]) return cache[resolvedId].exports;
    const factory = modules[resolvedId];

    if (!factory) {
      throw new Error('Module not found: ' + resolvedId);
    }

    const module = { exports: {} };
    cache[resolvedId] = module;
    factory((specifier) => requireModule(specifier, resolvedId), module, module.exports);
    return module.exports;
  }

  requireModule('src/main');
})();`;
}

async function build() {
  await fs.rm(distDir, { recursive: true, force: true });
  await fs.mkdir(path.join(distDir, 'assets'), { recursive: true });

  const bundle = await buildBundle();
  await fs.writeFile(path.join(distDir, 'assets', 'app.js'), bundle);
  await fs.copyFile(path.join(srcDir, 'styles.css'), path.join(distDir, 'assets', 'styles.css'));
  await fs.copyFile(
    path.join(rootDir, 'node_modules', 'react', 'umd', 'react.production.min.js'),
    path.join(distDir, 'assets', 'react.production.min.js'),
  );
  await fs.copyFile(
    path.join(rootDir, 'node_modules', 'react-dom', 'umd', 'react-dom.production.min.js'),
    path.join(distDir, 'assets', 'react-dom.production.min.js'),
  );
  await fs.copyFile(
    path.join(rootDir, 'node_modules', 'react-router', 'dist', 'umd', 'react-router.production.min.js'),
    path.join(distDir, 'assets', 'react-router.production.min.js'),
  );
  await fs.copyFile(
    path.join(
      rootDir,
      'node_modules',
      'react-router-dom',
      'dist',
      'umd',
      'react-router-dom.production.min.js',
    ),
    path.join(distDir, 'assets', 'react-router-dom.production.min.js'),
  );
  await copyDirectory(publicDir, distDir);

  const html = `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#0f766e" />
    <meta
      name="description"
      content="운휴매니저는 차량과 장비의 운휴 상태를 빠르게 확인하고 관리하는 모바일 우선 PWA입니다."
    />
    <link rel="icon" type="image/svg+xml" href="/icons/icon.svg" />
    <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
    <link rel="manifest" href="/manifest.webmanifest" />
    <link rel="stylesheet" href="/assets/styles.css" />
    <title>운휴매니저</title>
  </head>
  <body>
    <div id="root"></div>
    <script src="/assets/react.production.min.js"></script>
    <script src="/assets/react-dom.production.min.js"></script>
    <script src="/assets/react-router.production.min.js"></script>
    <script src="/assets/react-router-dom.production.min.js"></script>
    <script src="/assets/app.js"></script>
  </body>
</html>
`;

  await fs.writeFile(path.join(distDir, 'index.html'), html);
}

await build();

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const viteBin = path.join(rootDir, 'node_modules', 'vite', 'bin', 'vite.js');
const nodeMajor = Number.parseInt(process.versions.node.split('.')[0] || '0', 10);
const args = [viteBin, 'build'];

if (nodeMajor >= 22) {
  args.push('--configLoader', 'native');
}

const result = spawnSync(process.execPath, args, {
  cwd: rootDir,
  stdio: 'inherit',
});

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);

import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const rootDir = process.cwd();
const distDir = path.join(rootDir, 'dist');
const deployDir = path.join(rootDir, '.deploy-gh-pages');

function run(command, args, options = {}) {
  execFileSync(command, args, {
    cwd: options.cwd || rootDir,
    stdio: 'inherit',
  });
}

function getOutput(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: options.cwd || rootDir,
    encoding: 'utf8',
  }).trim();
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function findGitCommand() {
  try {
    execFileSync('git', ['--version'], { stdio: 'ignore' });
    return 'git';
  } catch {
    const githubDesktopDir = path.join(process.env.LOCALAPPDATA || '', 'GitHubDesktop');

    if (await pathExists(githubDesktopDir)) {
      const entries = await fs.readdir(githubDesktopDir);
      const appDirs = entries.filter((entry) => entry.startsWith('app-')).sort().reverse();

      for (const appDir of appDirs) {
        const gitPath = path.join(
          githubDesktopDir,
          appDir,
          'resources',
          'app',
          'git',
          'cmd',
          'git.exe',
        );

        if (await pathExists(gitPath)) {
          return gitPath;
        }
      }
    }

    return 'git';
  }
}

async function deploy() {
  if (!(await pathExists(path.join(distDir, 'index.html')))) {
    throw new Error('dist/index.html이 없습니다. npm run build를 먼저 실행하세요.');
  }

  const git = await findGitCommand();
  const remoteUrl = getOutput(git, ['remote', 'get-url', 'origin']);

  await fs.rm(deployDir, { recursive: true, force: true });
  await fs.mkdir(deployDir, { recursive: true });
  await fs.cp(distDir, deployDir, { recursive: true });
  await fs.writeFile(path.join(deployDir, '.nojekyll'), '');

  run(git, ['init'], { cwd: deployDir });
  run(git, ['checkout', '-B', 'gh-pages'], { cwd: deployDir });
  run(git, ['remote', 'add', 'origin', remoteUrl], { cwd: deployDir });
  run(git, ['config', 'user.name', 'unhyu-manager deploy'], { cwd: deployDir });
  run(git, ['config', 'user.email', 'deploy@unhyu-manager.local'], { cwd: deployDir });
  run(git, ['add', '.'], { cwd: deployDir });
  run(git, ['commit', '-m', 'Deploy to GitHub Pages'], { cwd: deployDir });
  run(git, ['push', '--force', 'origin', 'gh-pages'], { cwd: deployDir });

  await fs.rm(deployDir, { recursive: true, force: true });
}

await deploy();

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const lockfile = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const versions = Object.fromEntries(
  ['node_modules/vitest', 'node_modules/vite', 'node_modules/esbuild'].map((path) => [
    path,
    lockfile.packages[path]?.version ?? 'missing',
  ]),
);
try {
  execFileSync('npm', ['audit', '--audit-level=high'], { stdio: 'ignore' });
} catch {
  console.error(JSON.stringify({ level: 'ERROR', stage: 'security-check', event: 'dependency-audit-failed' }));
  process.exit(1);
}

console.log(
  JSON.stringify({
    level: 'INFO',
    stage: 'security-check',
    event: '[FIX:dependency-security] dependency-baseline-passed',
    package: packageJson.name,
    versions,
  }),
);

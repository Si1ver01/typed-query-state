import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const output = execFileSync('npm', ['pack', '--dry-run', '--json'], { encoding: 'utf8' });
const report = JSON.parse(output)[0];
const files = report.files.map(({ path }) => path);
const required = [
  'dist/index.js',
  'dist/index.cjs',
  'dist/index.d.ts',
  'dist/react.js',
  'dist/codecs.js',
  'README.md',
  'LICENSE',
];
const missing = required.filter((file) => !files.includes(file));
if (missing.length > 0) {
  console.error(JSON.stringify({ level: 'ERROR', stage: 'pack-check', event: 'missing-files', missing }));
  process.exit(1);
}
console.log(
  JSON.stringify({
    level: 'INFO',
    stage: 'pack-check',
    event: 'tarball-ready',
    tarball: report.filename,
    fileCount: files.length,
    entrypoints: Object.keys(pkg.exports),
  }),
);

const tarball = execFileSync('npm', ['pack', '--silent'], { encoding: 'utf8' }).trim().split('\n').at(-1);
const fixture = mkdtempSync(join(tmpdir(), 'typed-query-state-consumer-'));
try {
  execFileSync('npm', ['init', '--yes'], { cwd: fixture, stdio: 'ignore' });
  execFileSync('npm', ['install', '--ignore-scripts', join(process.cwd(), tarball)], { cwd: fixture, stdio: 'ignore' });
  execFileSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      "await import('@ddanshin/typed-query-state'); await import('@ddanshin/typed-query-state/codecs'); await import('@ddanshin/typed-query-state/react');",
    ],
    { cwd: fixture, stdio: 'ignore' },
  );
  execFileSync(
    process.execPath,
    [
      '-e',
      "require('@ddanshin/typed-query-state'); require('@ddanshin/typed-query-state/codecs'); require('@ddanshin/typed-query-state/react');",
    ],
    { cwd: fixture, stdio: 'ignore' },
  );
  console.log(
    JSON.stringify({
      level: 'INFO',
      stage: 'pack-check',
      event: 'consumer-smoke-passed',
      entrypoints: ['.', './codecs', './react'],
    }),
  );
} finally {
  rmSync(fixture, { recursive: true, force: true });
  rmSync(join(process.cwd(), tarball), { force: true });
}

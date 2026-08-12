const tag = process.env.GITHUB_REF_NAME ?? process.argv[2];
const version = JSON.parse(
  await import('node:fs').then(({ readFileSync }) => readFileSync('package.json', 'utf8')),
).version;
if (tag && tag !== `v${version}`) {
  console.error(
    JSON.stringify({
      level: 'ERROR',
      stage: 'release-check',
      event: 'tag-version-mismatch',
      tag,
      expected: `v${version}`,
    }),
  );
  process.exit(1);
}
console.log(
  JSON.stringify({ level: 'INFO', stage: 'release-check', event: 'tag-valid', tag: tag ?? `v${version}`, version }),
);

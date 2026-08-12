import { existsSync, readFileSync } from 'node:fs';

const readme = readFileSync('README.md', 'utf8');
const required = ['Установка', 'Быстрый старт', 'SSR', 'История навигации', 'Ограничения'];
const missing = required.filter((section) => !readme.includes(section));
const links = [...readme.matchAll(/\]\(([^)]+)\)/g)]
  .map((match) => match[1])
  .filter((target) => !/^https?:/.test(target));
const broken = links.filter((target) => !existsSync(target));
if (missing.length || broken.length) {
  console.error(JSON.stringify({ level: 'ERROR', stage: 'docs-check', missing, broken }));
  process.exit(1);
}
console.log(JSON.stringify({ level: 'INFO', stage: 'docs-check', event: 'documentation-valid', links: links.length }));

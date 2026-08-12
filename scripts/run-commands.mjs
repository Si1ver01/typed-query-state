import { spawnSync } from 'node:child_process';

const [, , stage = 'unknown', ...rawCommands] = process.argv;
const commands = rawCommands
  .reduce(
    (groups, argument) => {
      if (argument === ':::') groups.push([]);
      else groups.at(-1).push(argument);
      return groups;
    },
    [[]],
  )
  .filter((command) => command.length > 0);
const levels = { DEBUG: 10, INFO: 20, ERROR: 30 };
const level = (process.env.LOG_LEVEL ?? 'INFO').toUpperCase();
const threshold = levels[level] ?? levels.INFO;
const log = (name, data = {}) => {
  if (levels[name] >= threshold) {
    console.log(JSON.stringify({ level: name, stage, ...data }));
  }
};
log('INFO', {
  event: 'stage-start',
  node: process.version,
  npm: process.env.npm_config_user_agent?.split(' ')[0] ?? 'unknown',
});
for (const [executable, ...args] of commands) {
  log('DEBUG', { event: '[FIX:command-runner] command', executable, args });
  const result = spawnSync(executable, args, { shell: false, stdio: 'inherit', env: process.env });
  if (result.status !== 0) {
    console.error(
      JSON.stringify({ level: 'ERROR', stage, event: 'command-failed', executable, args, status: result.status }),
    );
    process.exit(result.status ?? 1);
  }
}
log('INFO', { event: 'stage-complete', commands: commands.length });

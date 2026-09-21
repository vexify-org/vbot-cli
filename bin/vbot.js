#!/usr/bin/env node

'use strict';

/**
 * vbot-cli - Production-grade CLI framework
 * Entry point: bin/vbot.js
 */

const { Command, Option } = require('commander');
const chalk = require('chalk');
const pkg = require('../package.json');

// Commands
const { initCommand } = require('../src/commands/init');
const { deployCommand } = require('../src/commands/deploy');
const { statusCommand } = require('../src/commands/status');
const { pluginCommand } = require('../src/commands/plugin');
const { build } = require('../src/utils/build');
const { Logger } = require('../src/utils/logger');

const logger = new Logger({ verbose: false });

// Global error handler
process.on('uncaughtException', err => {
  logger.error(`Uncaught exception: ${err.message}`);
  if (process.env.VBOT_DEBUG) console.error(err.stack);
  process.exit(1);
});

process.on('unhandledRejection', reason => {
  logger.error(`Unhandled rejection: ${reason}`);
  if (process.env.VBOT_DEBUG) console.error(reason);
  process.exit(1);
});

const program = new Command();

program
  .name('vbot')
  .description('vbot-cli — Production-grade CLI framework for modern JavaScript')
  .version(pkg.version, '-v, --version', 'output the current version')
  .helpOption('-h, --help', 'display help for command')
  .addOption(new Option('-V, --verbose', 'enable verbose output').default(false))
  .configureOutput({
    writeOut: str => process.stdout.write(str),
    writeErr: str => process.stderr.write(str),
    getOutHasColors: () => process.stdout.isTTY,
    getErrHasColors: () => process.stderr.isTTY,
  });

// ─── init command ────────────────────────────────────────────────────────────
program
  .command('init')
  .description('Initialize a new vbot project')
  .argument('[name]', 'project name', 'my-vbot-project')
  .option('-t, --template <name>', 'project template', 'default')
  .option('-d, --description <text>', 'project description', '')
  .option('-a, --author <name>', 'author name', '')
  .option('-e, --email <email>', 'author email', '')
  .option('--typescript', 'use TypeScript template', false)
  .option('-f, --force', 'overwrite if directory exists', false)
  .option('-V, --verbose', 'verbose output')
  .action(async (name, options) => {
    try {
      await initCommand({ name, ...options });
    } catch (err) {
      logger.error(err.message);
      process.exit(1);
    }
  });

// ─── deploy command ──────────────────────────────────────────────────────────
program
  .command('deploy')
  .description('Deploy the current project to a target environment')
  .option('-e, --env <env>', 'target environment', 'production')
  .option('-r, --region <region>', 'target region', 'us-east-1')
  .option('-b, --build', 'run build before deploying', true)
  .option('--skip-build', 'skip the build step')
  .option('--skip-health-check', 'skip post-deploy health checks')
  .option('--no-rollback', 'do not rollback on failure', false)
  .option('--dry-run', 'validate config without deploying', false)
  .option('-p, --project-path <path>', 'project root path', process.cwd())
  .option('-V, --verbose', 'verbose output')
  .action(async options => {
    try {
      await deployCommand(options);
    } catch (err) {
      logger.error(err.message);
      if (process.env.VBOT_DEBUG) console.error(err.stack);
      process.exit(1);
    }
  });

// ─── status command ─────────────────────────────────────────────────────────
program
  .command('status')
  .description('Show status of the current project and environment')
  .option('--json', 'output as JSON')
  .option('-p, --project-path <path>', 'project root path', process.cwd())
  .option('-V, --verbose', 'verbose output')
  .action(async options => {
    try {
      await statusCommand(options);
    } catch (err) {
      logger.error(err.message);
      process.exit(1);
    }
  });

// ─── plugin command ─────────────────────────────────────────────────────────
const pluginCmd = program
  .command('plugin')
  .description('Manage vbot plugins');

pluginCmd
  .command('list')
  .description('List installed plugins')
  .option('-V, --verbose', 'verbose output')
  .action(async options => {
    await pluginCommand({ action: 'list', ...options });
  });

pluginCmd
  .command('add <name>')
  .description('Install and register a plugin')
  .option('-p, --project-path <path>', 'project root', process.cwd())
  .option('-V, --verbose', 'verbose output')
  .action(async (name, options) => {
    await pluginCommand({ action: 'add', name, ...options });
  });

pluginCmd
  .command('remove <name>')
  .description('Remove a plugin from config')
  .option('-p, --project-path <path>', 'project root', process.cwd())
  .option('-V, --verbose', 'verbose output')
  .action(async (name, options) => {
    await pluginCommand({ action: 'remove', name, ...options });
  });

pluginCmd
  .command('search <query>')
  .description('Search for plugins in the registry')
  .option('-V, --verbose', 'verbose output')
  .action(async (query, options) => {
    await pluginCommand({ action: 'search', name: query, ...options });
  });

pluginCmd
  .command('info <name>')
  .description('Show detailed info about a plugin')
  .option('-V, --verbose', 'verbose output')
  .action(async (name, options) => {
    await pluginCommand({ action: 'info', name, ...options });
  });

pluginCmd
  .command('update')
  .description('Update all installed plugins')
  .option('-p, --project-path <path>', 'project root', process.cwd())
  .option('-V, --verbose', 'verbose output')
  .action(async options => {
    await pluginCommand({ action: 'update', ...options });
  });

// ─── build command ───────────────────────────────────────────────────────────
program
  .command('build')
  .description('Build the current project')
  .option('--build-command <cmd>', 'custom build command')
  .option('--bundler <name>', 'force bundler (webpack|vite|rollup|esbuild|tsc)')
  .option('-w, --watch', 'watch mode')
  .option('-p, --project-path <path>', 'project root', process.cwd())
  .option('-V, --verbose', 'verbose output')
  .action(async options => {
    try {
      const result = await build(options);
      process.exit(result.success ? 0 : 1);
    } catch (err) {
      logger.error(err.message);
      process.exit(1);
    }
  });

// ─── help footer ─────────────────────────────────────────────────────────────
program.on('--help', () => {
  console.log();
  console.log(chalk.gray('  Examples:'));
  console.log();
  console.log(`    $ ${chalk.cyan('vbot init my-project')}`);
  console.log(`    $ ${chalk.cyan('vbot init api-service -t typescript -d "My API"')}`);
  console.log(`    $ ${chalk.cyan('vbot deploy --env staging')}`);
  console.log(`    $ ${chalk.cyan('vbot deploy -e production -r eu-west-1')}`);
  console.log(`    $ ${chalk.cyan('vbot status --json')}`);
  console.log(`    $ ${chalk.cyan('vbot plugin add @vbot/analytics')}`);
  console.log(`    $ ${chalk.cyan('vbot plugin search auth')}`);
  console.log(`    $ ${chalk.cyan('vbot build --watch')}`);
  console.log();
  console.log(chalk.gray(`  vbot-cli v${pkg.version} · Documentation: ${pkg.homepage}`));
});

program.parseAsync(process.argv).catch(err => {
  logger.error(err.message);
  process.exit(1);
});

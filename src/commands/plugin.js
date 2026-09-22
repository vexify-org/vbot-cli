/**
 * plugin.js — Plugin management commands
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { listPlugins, installPlugin, uninstallPlugin } from '../core/plugin-manager.js';
import logger from '../core/logger.js';

// plugin list
const listCmd = new Command('list');
listCmd.description('List installed plugins').action(() => {
  const plugins = listPlugins();

  if (plugins.length === 0) {
    console.log(`  ${chalk.dim('No plugins installed.')}`);
    console.log(`  ${chalk.dim('Run:')} ${chalk.cyan('vbot plugin install <name>')}`);
    return;
  }

  console.log(`\n  ${chalk.bold(`${plugins.length} plugin(s) installed`)}`);
  for (const p of plugins) {
    const desc = p.description ? chalk.dim(` — ${p.description}`) : '';
    console.log(`  ${chalk.green('•')} ${chalk.bold(p.name)} ${chalk.dim(`v${p.version}`)}${desc}`);
  }
  console.log();
});

// plugin install
const installCmd = new Command('install');
installCmd
  .description('Install a plugin from npm')
  .argument('<name>', 'Plugin name on npm')
  .option('-v, --verbose', 'Show npm output')
  .action(async (name, options) => {
    const spinner = ora(`Installing plugin "${name}"...`).start();
    const ok = await installPlugin(name, { verbose: options.verbose });
    spinner.stop();
    if (!ok) process.exit(1);
  });

// plugin uninstall
const uninstallCmd = new Command('uninstall');
uninstallCmd
  .description('Uninstall a plugin')
  .argument('<name>', 'Plugin name')
  .action((name) => {
    const ok = uninstallPlugin(name);
    if (!ok) process.exit(1);
  });

// plugin search
const searchCmd = new Command('search');
searchCmd
  .description('Search available plugins (via npm)')
  .argument('<query>', 'Search term')
  .option('--limit <n>', 'Max results', '10')
  .action(async (query, options) => {
    const { execSync } = await import('child_process');
    const limit = parseInt(options.limit, 10);

    const spinner = ora(`Searching npm for "${query}"...`).start();
    try {
      const raw = execSync(
        `npm search "${query}" --json 2>/dev/null | head -${limit * 20}`,
        { encoding: 'utf-8', timeout: 15000 }
      );
      spinner.stop();

      let results = [];
      try {
        results = JSON.parse(raw);
      } catch {
        spinner.warn('Failed to parse npm search results.');
        return;
      }

      if (!results.length) {
        console.log(`  ${chalk.dim('No results found.')}`);
        return;
      }

      console.log(`\n  ${chalk.bold(`${results.length} result(s) for "${query}"`)}`);
      for (const r of results.slice(0, limit)) {
        const name = chalk.cyan(r.name);
        const ver = chalk.dim(`v${r.version}`);
        const desc = r.description ? ` — ${chalk.dim(r.description.slice(0, 60))}` : '';
        console.log(`  ${name} ${ver}${desc}`);
      }
      console.log();
    } catch {
      spinner.warn('Search failed (npm may be unavailable).');
    }
  });

// Top-level plugin command
export const pluginCommand = new Command('plugin');
pluginCommand
  .description('Manage plugins — list, install, uninstall, search')
  .addCommand(listCmd);
pluginCommand.addCommand(installCmd);
pluginCommand.addCommand(uninstallCmd);
pluginCommand.addCommand(searchCmd);

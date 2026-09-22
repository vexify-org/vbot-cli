/**
 * config.js — Configuration management commands
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { getConfig, setConfig, listConfig } from '../core/config-manager.js';

const getCmd = new Command('get');
getCmd
  .description('Get a configuration value')
  .argument('<key>', 'Configuration key')
  .action((key) => {
    const value = getConfig(key);
    if (value === undefined) {
      console.log(`  ${chalk.yellow(`Key "${key}" not found.`)}`);
      return;
    }
    console.log(`${chalk.cyan(key)}: ${JSON.stringify(value)}`);
  });

const setCmd = new Command('set');
setCmd
  .description('Set a configuration value')
  .argument('<key>', 'Configuration key')
  .argument('<value>', 'Configuration value')
  .action((key, value) => {
    try {
      // Try to parse as JSON (number, bool, object)
      const parsed = JSON.parse(value);
      setConfig(key, parsed);
    } catch {
      // Store as string
      setConfig(key, value);
    }
    console.log(`${chalk.cyan(key)} ${chalk.green('set to')} ${chalk.bold(JSON.stringify(getConfig(key)))}`);
  });

const listCmd = new Command('list');
listCmd.description('List all configuration values').action(() => {
  const cfg = listConfig();
  const entries = Object.entries(cfg);

  if (!entries.length) {
    console.log(`  ${chalk.dim('No configuration found.')}`);
    return;
  }

  console.log(`\n  ${chalk.bold('VBot Configuration')}`);
  for (const [key, value] of entries) {
    const valStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
    console.log(`  ${chalk.cyan(key.padEnd(14))}  ${valStr}`);
  }
  console.log();
});

export const configCommand = new Command('config');
configCommand
  .description('Manage VBot configuration')
  .addCommand(getCmd);
configCommand.addCommand(setCmd);
configCommand.addCommand(listCmd);

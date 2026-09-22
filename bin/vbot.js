#!/usr/bin/env node
/**
 * vbot-cli — Entry point
 * Production-grade CLI framework for modern JavaScript
 */

import { Command } from 'commander';
import chalk from 'chalk';
import {
  initCommand,
  deployCommand,
  statusCommand,
  pluginCommand,
  configCommand,
  infoCommand,
} from '../src/commands/index.js';

const program = new Command();

program
  .name('vbot')
  .description('VBot CLI — Build, deploy, and extend with plugins')
  .version('1.0.0')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    if (!opts.verbose) {
      // Suppress noisy debug output
    }
  });

// Register commands
program.addCommand(initCommand);
program.addCommand(deployCommand);
program.addCommand(statusCommand);
program.addCommand(pluginCommand);
program.addCommand(configCommand);
program.addCommand(infoCommand);

// Global --verbose flag
program.option('-v, --verbose', 'Enable verbose output', false);

program.parseAsync(process.argv).catch((err) => {
  console.error(chalk.red(`\n✖ ${err.message}`));
  if (program.opts().verbose) {
    console.error(err.stack);
  }
  process.exit(1);
});

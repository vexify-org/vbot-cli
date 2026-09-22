/**
 * info.js — Display version and environment information
 */

import { Command } from 'commander';
import os from 'os';
import chalk from 'chalk';
import { readFileSync } from 'fs';

function getVbotVersion() {
  try {
    const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf-8'));
    return pkg.version;
  } catch {
    return 'unknown';
  }
}

function formatRow(label, value) {
  return `  ${chalk.dim('•')} ${chalk.cyan(label.padEnd(18))}  ${chalk.white(value)}`;
}

export const infoCommand = new Command('info')
  .description('Display version, environment, and system information')
  .option('--full', 'Show extended information')
  .action((options) => {
    const version = getVbotVersion();

    console.log(`\n  ${chalk.bold.cyan('╭── VBot CLI ──────────────────────────╮')}`);
    console.log(formatRow('Version', `v${version}`));
    console.log(formatRow('Node.js', process.version));
    console.log(formatRow('Platform', `${os.type()} ${os.arch()}`));
    console.log(formatRow('OS', os.release()));
    console.log(formatRow('CPU cores', String(os.cpus().length)));
    console.log(formatRow('Total memory', `${Math.round(os.totalmem() / 1024 / 1024)} MB`));
    console.log(formatRow('Home dir', os.homedir()));
    console.log(formatRow('CWD', process.cwd()));
    console.log(formatRow('Process ID', String(process.pid)));
    console.log(formatRow('Command', process.argv.slice(0, 3).join(' ')));

    if (options.full) {
      console.log(`  ${chalk.bold('\n  Environment')}`);
      for (const [key, val] of Object.entries(process.env).filter(
        ([k]) => !k.startsWith('_') && !k.includes('SECRET') && !k.includes('KEY') && !k.includes('TOKEN')
      ).slice(0, 20)) {
        console.log(formatRow(key, String(val).slice(0, 60)));
      }
    }

    console.log(`  ${chalk.dim('╰────────────────────────────────────────╯')}\n`);
  });

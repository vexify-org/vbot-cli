/**
 * logger.js — Colored console output with chalk
 */

import chalk from 'chalk';

const PREFIX = chalk.cyan('[vbot]');

export const logger = {
  info(msg, ...args) {
    console.log(`${PREFIX} ${chalk.white(msg)}`, ...args);
  },
  success(msg, ...args) {
    console.log(`${PREFIX} ${chalk.green('✓')} ${chalk.green(msg)}`, ...args);
  },
  warn(msg, ...args) {
    console.warn(`${PREFIX} ${chalk.yellow('⚠')} ${chalk.yellow(msg)}`, ...args);
  },
  error(msg, ...args) {
    console.error(`${PREFIX} ${chalk.red('✖')} ${chalk.red(msg)}`, ...args);
  },
  debug(msg, ...args) {
    if (process.env.VBOT_DEBUG) {
      console.debug(`${PREFIX} ${chalk.gray('[debug]')} ${chalk.gray(msg)}`, ...args);
    }
  },
  dim(msg, ...args) {
    console.log(`${PREFIX} ${chalk.dim(msg)}`, ...args);
  },
  bold(msg, ...args) {
    console.log(`${PREFIX} ${chalk.bold(msg)}`, ...args);
  },
};

export default logger;

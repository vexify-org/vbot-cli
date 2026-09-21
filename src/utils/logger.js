'use strict';

const chalk = require('chalk');

const LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  success: 3,
  debug: 4,
};

const COLORS = {
  error: 'red',
  warn: 'yellow',
  info: 'cyan',
  success: 'green',
  debug: 'gray',
  log: 'white',
  verbose: 'dim',
};

const ICONS = {
  error: '✗',
  warn: '⚠',
  info: 'ℹ',
  success: '✓',
  debug: '◉',
};

class Logger {
  constructor(options = {}) {
    this.silent = options.silent || false;
    this.verbose = options.verbose || false;
    this.minLevel = options.minLevel || 'info';
    this.timestamps = options.timestamps || false;
    this.prefix = options.prefix || '';
  }

  _shouldLog(level) {
    const current = LEVELS[level] ?? 2;
    const min = LEVELS[this.minLevel] ?? 2;
    return current <= min;
  }

  _format(level, ...args) {
    const parts = [];
    if (this.timestamps) {
      parts.push(chalk.gray(new Date().toISOString().slice(11, 23)));
    }
    if (this.prefix) {
      parts.push(chalk.gray(this.prefix));
    }
    const icon = ICONS[level] || '·';
    const colorFn = chalk[COLORS[level]] || chalk.white;
    parts.push(colorFn(icon));
    parts.push(...args.map(a => typeof a === 'string' ? a : util.inspect(a, { colors: true, depth: 3 })));
    return parts.join(' ');
  }

  error(...args) {
    if (this.silent || !this._shouldLog('error')) return;
    console.error(this._format('error', ...args));
  }

  warn(...args) {
    if (this.silent || !this._shouldLog('warn')) return;
    console.warn(this._format('warn', ...args));
  }

  info(...args) {
    if (this.silent || !this._shouldLog('info')) return;
    console.log(this._format('info', ...args));
  }

  success(...args) {
    if (this.silent || !this._shouldLog('success')) return;
    console.log(this._format('success', ...args));
  }

  debug(...args) {
    if (this.silent || !this.verbose || !this._shouldLog('debug')) return;
    console.log(this._format('debug', ...args));
  }

  log(...args) {
    if (this.silent) return;
    console.log(...args);
  }

  verbose(...args) {
    if (this.silent || !this.verbose) return;
    console.log(this._format('verbose', ...args));
  }

  child(extra) {
    return new Logger({ ...this, ...extra });
  }

  indent() {
    return this.child({ prefix: this.prefix ? `${this.prefix}  ` : '  ' });
  }

  section(title) {
    if (this.silent) return;
    console.log();
    console.log(chalk.bold.cyan(`  ${title}`));
    console.log(chalk.gray('  ' + '─'.repeat(40)));
  }
}

const util = require('util');

module.exports = { Logger };

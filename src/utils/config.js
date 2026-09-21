'use strict';

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const Configstore = require('configstore');
const { fetchTemplate } = require('../utils/network');
const { loadPlugins } = require('../plugin/manager');

const PKG = require('../../package.json');

class Logger {
  constructor(options = {}) {
    this.silent = options.silent || false;
    this.verbose = options.verbose || false;
  }

  log(...args) {
    if (!this.silent) console.log(...args);
  }

  info(msg, ...args) {
    this.log(chalk.blue('ℹ'), chalk.cyan(msg), ...args);
  }

  success(msg, ...args) {
    this.log(chalk.green('✓'), msg, ...args);
  }

  warn(msg, ...args) {
    this.log(chalk.yellow('⚠'), msg, ...args);
  }

  error(msg, ...args) {
    this.log(chalk.red('✗'), msg, ...args);
  }

  debug(msg, ...args) {
    if (this.verbose) this.log(chalk.gray('[DEBUG]'), msg, ...args);
  }
}

class VBotConfig {
  constructor() {
    this.conf = new Configstore('vbot-cli', {
      version: PKG.version,
      registry: 'https://registry.npmjs.org',
      plugins: [],
      aliases: {},
    });
  }

  get(key, defaultValue) {
    return this.conf.get(key) !== undefined ? this.conf.get(key) : defaultValue;
  }

  set(key, value) {
    this.conf.set(key, value);
  }

  delete(key) {
    this.conf.delete(key);
  }

  getAll() {
    return this.conf.all;
  }

  reset() {
    this.conf.clear();
  }
}

class PluginManager {
  constructor(logger) {
    this.logger = logger;
    this.plugins = new Map();
  }

  async load(pluginPaths = []) {
    for (const pluginPath of pluginPaths) {
      try {
        const PluginClass = require(path.resolve(pluginPath));
        const plugin = new PluginClass();
        await plugin.init(this.logger);
        this.plugins.set(plugin.name, plugin);
        this.logger.debug(`Loaded plugin: ${plugin.name} v${plugin.version}`);
      } catch (err) {
        this.logger.error(`Failed to load plugin from ${pluginPath}: ${err.message}`);
      }
    }
  }

  get(name) {
    return this.plugins.get(name);
  }

  list() {
    return Array.from(this.plugins.values()).map(p => ({
      name: p.name,
      version: p.version,
      description: p.description,
    }));
  }
}

function loadConfig(searchPaths = []) {
  const configPaths = ['.vbotrc', '.vbotrc.js', '.vbotrc.json', 'vbot.config.js'];
  const allPaths = [...searchPaths, ...configPaths];

  for (const configPath of allPaths) {
    const resolved = path.resolve(process.cwd(), configPath);
    if (fs.existsSync(resolved)) {
      try {
        const content = fs.readFileSync(resolved, 'utf-8');
        if (configPath.endsWith('.js')) {
          const module = require(path.resolve(resolved));
          return typeof module === 'function' ? module() : module;
        }
        return JSON.parse(content);
      } catch (err) {
        throw new Error(`Failed to load config from ${configPath}: ${err.message}`);
      }
    }
  }

  return {};
}

function validateProject(projectPath) {
  const pkgPath = path.join(projectPath, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    throw new Error(`No package.json found in ${projectPath}. Run 'vbot init' first.`);
  }
  return JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
}

module.exports = {
  Logger,
  VBotConfig,
  PluginManager,
  loadConfig,
  validateProject,
};

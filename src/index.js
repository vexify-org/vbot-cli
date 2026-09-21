'use strict';

const { Logger } = require('./utils/logger');
const { VBotConfig, PluginManager, loadConfig } = require('./utils/config');
const { initCommand } = require('./commands/init');
const { deployCommand } = require('./commands/deploy');
const { statusCommand } = require('./commands/status');
const { pluginCommand } = require('./commands/plugin');
const { build } = require('./utils/build');
const { checkConnectivity, checkHealth } = require('./utils/network');
const { detectBundler } = require('./utils/build');

const PKG = require('../package.json');

const DEFAULT_CONFIG = {
  registry: 'https://registry.npmjs.org',
  plugins: [],
  aliases: {},
  logLevel: 'info',
  confirmOnPublish: true,
};

class VBot {
  constructor(options = {}) {
    this.options = { ...DEFAULT_CONFIG, ...options };
    this.logger = new Logger({ verbose: options.verbose, silent: options.silent });
    this.config = new VBotConfig();
    this.pluginManager = new PluginManager({ logger: this.logger });
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return this;

    this.logger.debug(`vbot-cli v${PKG.version} initializing...`);

    // Load config
    const userConfig = this.config.getAll();
    this.options = { ...DEFAULT_CONFIG, ...userConfig, ...this.options };

    // Load plugins
    const pluginList = this.config.get('plugins', []);
    if (pluginList.length > 0) {
      this.logger.debug(`Loading ${pluginList.length} plugin(s)...`);
      await this.pluginManager.loadFromConfig(pluginList);
    }

    this.initialized = true;
    return this;
  }

  async run(command, args = []) {
    if (!this.initialized) await this.init();

    const ctx = {
      command,
      args,
      cwd: process.cwd(),
      env: process.env,
      vbot: this,
      logger: this.logger,
    };

    // Invoke pre-command hooks
    await this.pluginManager.invoke('preCommand', ctx);

    let result;
    switch (command) {
      case 'init':
        result = await initCommand(args);
        break;
      case 'deploy':
        result = await deployCommand(args);
        break;
      case 'status':
        result = await statusCommand(args);
        break;
      case 'plugin':
        result = await pluginCommand(args);
        break;
      case 'build':
        result = await build(args);
        break;
      default:
        throw new Error(`Unknown command: ${command}`);
    }

    // Invoke post-command hooks
    await this.pluginManager.invoke('postCommand', { ...ctx, result });

    return result;
  }

  async destroy() {
    this.logger.debug('Shutting down vbot...');
    await this.pluginManager.reloadAll(); // triggers deactivate on all
    this.initialized = false;
  }
}

module.exports = {
  VBot,
  initCommand,
  deployCommand,
  statusCommand,
  pluginCommand,
  build,
  Logger,
  VBotConfig,
  PluginManager,
  checkConnectivity,
  checkHealth,
  detectBundler,
};

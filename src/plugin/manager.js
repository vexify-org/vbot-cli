'use strict';

const path = require('path');
const fs = require('fs');
const { Logger } = require('../utils/logger');

class BasePlugin {
  constructor() {
    this.name = 'base-plugin';
    this.version = '1.0.0';
    this.description = '';
    this.author = '';
    this.logger = null;
    this.hooks = {};
    this.options = {};
  }

  setLogger(logger) {
    this.logger = logger;
  }

  setOptions(options) {
    this.options = { ...this.options, ...options };
  }

  async init(logger) {
    this.logger = logger || new Logger();
    this.logger.debug(`Initializing plugin: ${this.name}`);
    return this;
  }

  async activate() {
    this.logger?.debug(`Activating plugin: ${this.name}`);
  }

  async deactivate() {
    this.logger?.debug(`Deactivating plugin: ${this.name}`);
  }

  registerHook(phase, handler) {
    if (!this.hooks[phase]) this.hooks[phase] = [];
    this.hooks[phase].push(handler);
  }

  async invokeHook(phase, ...args) {
    const handlers = this.hooks[phase] || [];
    let result;
    for (const handler of handlers) {
      result = await handler(...args);
    }
    return result;
  }

  getMetadata() {
    return {
      name: this.name,
      version: this.version,
      description: this.description,
      author: this.author,
    };
  }
}

class PluginManager {
  constructor(options = {}) {
    this.logger = options.logger || new Logger();
    this.plugins = new Map();
    this.hookRegistry = new Map();
    this.searchPaths = options.searchPaths || [
      path.join(process.cwd(), 'node_modules'),
      path.join(__dirname, '../../node_modules'),
    ];
    this.enabled = new Set(options.enabled || []);
    this.disabled = new Set(options.disabled || []);
  }

  async loadFromConfig(pluginsConfig = []) {
    for (const pluginSpec of pluginsConfig) {
      const name = typeof pluginSpec === 'string' ? pluginSpec : pluginSpec.name;
      const opts = typeof pluginSpec === 'object' ? pluginSpec.options : {};

      try {
        await this.load(name, opts);
      } catch (err) {
        this.logger.error(`Failed to load plugin "${name}": ${err.message}`);
      }
    }
  }

  async load(pluginName, options = {}) {
    if (this.disabled.has(pluginName)) {
      this.logger.debug(`Plugin "${pluginName}" is disabled, skipping`);
      return null;
    }

    if (this.plugins.has(pluginName)) {
      this.logger.debug(`Plugin "${pluginName}" already loaded`);
      return this.plugins.get(pluginName);
    }

    let PluginClass = null;
    let resolvedPath = null;

    // Try to resolve from search paths
    for (const searchPath of this.searchPaths) {
      const candidates = [
        path.join(searchPath, pluginName),
        path.join(searchPath, pluginName, 'index.js'),
        path.join(searchPath, `vbot-plugin-${pluginName}`),
        path.join(searchPath, `@vbot/plugin-${pluginName}`),
      ];

      for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
          try {
            resolvedPath = candidate;
            PluginClass = require(resolvedPath);
            break;
          } catch (err) {
            this.logger.debug(`Failed to require ${candidate}: ${err.message}`);
          }
        }
      }
      if (PluginClass) break;
    }

    // Fallback: try direct require
    if (!PluginClass) {
      try {
        PluginClass = require(pluginName);
        resolvedPath = pluginName;
      } catch (err) {
        throw new Error(`Plugin "${pluginName}" not found in any search path`);
      }
    }

    // Instantiate
    const plugin = new PluginClass();
    plugin.setLogger(this.logger);
    plugin.setOptions(options);

    await plugin.init(this.logger);
    await plugin.activate();

    this.plugins.set(pluginName, plugin);
    this.logger.success(`Loaded plugin: ${plugin.name}@${plugin.version} from ${resolvedPath}`);

    // Register hooks
    for (const [phase, handlers] of Object.entries(plugin.hooks)) {
      if (!this.hookRegistry.has(phase)) this.hookRegistry.set(phase, []);
      this.hookRegistry.get(phase).push(...handlers);
    }

    return plugin;
  }

  async unload(pluginName) {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) return false;

    await plugin.deactivate();
    this.plugins.delete(pluginName);

    // Remove from hook registry
    for (const [, handlers] of this.hookRegistry) {
      const before = handlers.length;
      // Keep non-plugin handlers - this is simplified
    }

    this.logger.info(`Unloaded plugin: ${pluginName}`);
    return true;
  }

  async invoke(phase, ...args) {
    const handlers = this.hookRegistry.get(phase) || [];
    const results = [];

    for (const handler of handlers) {
      try {
        const result = await handler(...args);
        results.push({ success: true, result });
      } catch (err) {
        results.push({ success: false, error: err.message });
        this.logger.error(`Hook "${phase}" handler failed: ${err.message}`);
      }
    }

    return results;
  }

  get(name) {
    return this.plugins.get(name);
  }

  has(name) {
    return this.plugins.has(name);
  }

  list() {
    return Array.from(this.plugins.values()).map(p => p.getMetadata());
  }

  enable(name) {
    this.disabled.delete(name);
    this.enabled.add(name);
  }

  disable(name) {
    this.enabled.delete(name);
    this.disabled.add(name);
  }

  async reloadAll() {
    const names = Array.from(this.plugins.keys());
    for (const name of names) {
      await this.unload(name);
      try {
        await this.load(name);
      } catch (err) {
        this.logger.error(`Failed to reload "${name}": ${err.message}`);
      }
    }
  }
}

module.exports = {
  PluginManager,
  BasePlugin,
};

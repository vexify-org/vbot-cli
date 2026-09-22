/**
 * plugin-manager.js — Plugin system
 * Loads plugins from ~/.vbot/plugins/
 * Plugin format: { name, version, commands: [], hooks: {} }
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { getConfig } from './config-manager.js';
import logger from './logger.js';

const HOME = os.homedir();

/**
 * Resolve plugins directory (supports ~)
 */
function resolvePluginsDir() {
  const dir = getConfig('pluginsDir') || path.join(HOME, '.vbot', 'plugins');
  return dir.replace(/^~/, HOME);
}

/**
 * Ensure plugins directory exists
 */
function ensurePluginsDir() {
  const dir = resolvePluginsDir();
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Discover and load all installed plugins
 */
export async function loadPlugins() {
  const pluginsDir = resolvePluginsDir();
  if (!fs.existsSync(pluginsDir)) {
    return [];
  }

  const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });
  const plugins = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const pluginPath = path.join(pluginsDir, entry.name);
    const pkgPath = path.join(pluginPath, 'package.json');

    if (!fs.existsSync(pkgPath)) continue;

    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      const mainFile = path.join(pluginPath, pkg.main || 'index.js');

      if (fs.existsSync(mainFile)) {
        const mod = await import(`file://${mainFile}`);
        const plugin = mod.default || mod;
        plugins.push({
          name: plugin.name || pkg.name,
          version: plugin.version || pkg.version,
          path: pluginPath,
          commands: plugin.commands || [],
          hooks: plugin.hooks || {},
        });
        logger.debug(`Loaded plugin: ${plugin.name || pkg.name}`);
      }
    } catch (err) {
      logger.warn(`Failed to load plugin ${entry.name}: ${err.message}`);
    }
  }

  return plugins;
}

/**
 * List installed plugins (synchronous, just reads directory)
 */
export function listPlugins() {
  const pluginsDir = resolvePluginsDir();
  if (!fs.existsSync(pluginsDir)) return [];

  const entries = fs.readdirSync(pluginsDir, { withFileTypes: true });
  const plugins = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const pkgPath = path.join(pluginsDir, entry.name, 'package.json');
    if (!fs.existsSync(pkgPath)) continue;

    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      plugins.push({
        name: pkg.name,
        version: pkg.version || 'unknown',
        description: pkg.description || '',
        path: path.join(pluginsDir, entry.name),
      });
    } catch {
      plugins.push({ name: entry.name, version: 'unknown', description: '', path: '' });
    }
  }

  return plugins;
}

/**
 * Install a plugin from npm registry
 */
export async function installPlugin(name, { verbose = false } = {}) {
  const { execSync } = await import('child_process');
  const destDir = ensurePluginsDir();
  const targetPath = path.join(destDir, name.replace(/^@/, '').replace(/\//g, '-'));

  if (fs.existsSync(targetPath)) {
    logger.error(`Plugin "${name}" is already installed. Run uninstall first.`);
    return false;
  }

  try {
    const registry = getConfig('registry') || 'https://registry.npmjs.org';
    logger.info(`Installing plugin "${name}" from ${registry}...`);

    execSync(`npm pack ${name} --pack-destination=${destDir}`, {
      stdio: verbose ? 'inherit' : 'pipe',
      encoding: 'utf-8',
    });

    // Find the tarball
    const tarball = fs.readdirSync(destDir)
      .filter(f => f.endsWith('.tgz'))
      .sort()
      .pop();

    if (!tarball) {
      logger.error('Failed to download plugin package.');
      return false;
    }

    execSync(`tar -xzf ${path.join(destDir, tarball)} -C ${destDir}`, {
      stdio: verbose ? 'inherit' : 'pipe',
    });

    // Rename extracted folder
    const extracted = fs.readdirSync(destDir).find(f => f.startsWith('package'));
    if (extracted) {
      fs.renameSync(path.join(destDir, extracted), targetPath);
    }

    fs.unlinkSync(path.join(destDir, tarball));
    logger.success(`Plugin "${name}" installed successfully.`);
    return true;
  } catch (err) {
    logger.error(`Failed to install plugin: ${err.message}`);
    return false;
  }
}

/**
 * Uninstall a plugin
 */
export function uninstallPlugin(name) {
  const destDir = resolvePluginsDir();
  const targetPath = path.join(destDir, name.replace(/^@/, '').replace(/\//g, '-'));

  if (!fs.existsSync(targetPath)) {
    logger.error(`Plugin "${name}" is not installed.`);
    return false;
  }

  try {
    fs.rmSync(targetPath, { recursive: true, force: true });
    logger.success(`Plugin "${name}" uninstalled.`);
    return true;
  } catch (err) {
    logger.error(`Failed to uninstall plugin: ${err.message}`);
    return false;
  }
}

export default { loadPlugins, listPlugins, installPlugin, uninstallPlugin };

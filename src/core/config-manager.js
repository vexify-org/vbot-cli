/**
 * config-manager.js — Configuration management
 * Supports ~/.vbot/config.json and environment variables
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOME = os.homedir();
const CONFIG_DIR = path.join(HOME, '.vbot');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const DEFAULT_CONFIG = {
  registry: 'https://registry.npmjs.org',
  pluginsDir: path.join(HOME, '.vbot', 'plugins'),
  theme: 'dark',
  verbose: false,
};

/**
 * Ensure config directory and default config exist
 */
function ensureConfig() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2));
  }
}

/**
 * Load config from file
 */
export function loadConfig() {
  try {
    ensureConfig();
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * Get a config value by key
 */
export function getConfig(key) {
  const cfg = loadConfig();
  if (!key) return cfg;
  return cfg[key];
}

/**
 * Set a config value
 */
export function setConfig(key, value) {
  ensureConfig();
  const cfg = loadConfig();
  cfg[key] = value;
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2));
}

/**
 * List all config keys/values
 */
export function listConfig() {
  return loadConfig();
}

export default { loadConfig, getConfig, setConfig, listConfig };

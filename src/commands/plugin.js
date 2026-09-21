'use strict';

const chalk = require('chalk');
const ora = require('ora');
const path = require('path');
const fs = require('fs');
const { Logger, VBotConfig } = require('../utils/config');

const SUPPORTED_REPOS = ['npm', 'github'];

function validatePluginName(name) {
  if (!name || typeof name !== 'string') {
    throw new Error('Plugin name is required');
  }
  if (name.length < 2 || name.length > 64) {
    throw new Error('Plugin name must be between 2 and 64 characters');
  }
  if (!/^(@[a-z0-9-]+\/)?[a-z@][a-z0-9-_./]+$/.test(name)) {
    throw new Error(
      'Invalid plugin name. Use format: plugin-name or @scope/plugin-name'
    );
  }
}

async function fetchNpmPlugin(name, logger) {
  const registry = 'https://registry.npmjs.org';
  const url = `${registry}/${name}/latest`;

  try {
    const response = await fetch(url, { timeout: 10000 });
    if (!response.ok) {
      throw new Error(`NPM returned ${response.status}`);
    }
    const data = await response.json();
    return {
      name: data.name,
      version: data.version,
      description: data.description || '',
      author: data.author?.name || '',
      repository: data.repository?.url || '',
      homepage: data.homepage || '',
      keywords: data.keywords || [],
      license: data.license || 'ISC',
      downloads: null,
      source: 'npm',
    };
  } catch (err) {
    throw new Error(`Failed to fetch plugin from NPM: ${err.message}`);
  }
}

async function fetchGitHubPlugin(repo, logger) {
  const [owner, name] = repo.replace('github:', '').split('/');
  const apiUrl = `https://api.github.com/repos/${owner}/${name}`;

  try {
    const response = await fetch(apiUrl, {
      headers: { 'User-Agent': 'vbot-cli' },
      timeout: 10000,
    });
    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status}`);
    }
    const data = await response.json();
    return {
      name: data.full_name,
      version: data.default_branch,
      description: data.description || '',
      author: data.owner?.login || '',
      repository: data.html_url,
      homepage: data.homepage || '',
      stars: data.stargazers_count,
      source: 'github',
    };
  } catch (err) {
    throw new Error(`Failed to fetch plugin from GitHub: ${err.message}`);
  }
}

async function searchNpmPlugins(query, logger) {
  const registry = 'https://registry.npmjs.org';
  const url = `${registry}/-/v1/search?text=vbot-plugin+${encodeURIComponent(query)}&size=5`;

  try {
    const response = await fetch(url, { timeout: 10000 });
    if (!response.ok) throw new Error(`NPM returned ${response.status}`);
    const data = await response.json();
    return (data.objects || []).map(pkg => ({
      name: pkg.package.name,
      version: pkg.package.version,
      description: pkg.package.description || '',
      link: `https://www.npmjs.com/package/${pkg.package.name}`,
    }));
  } catch (err) {
    logger.warn(`Plugin search failed: ${err.message}`);
    return [];
  }
}

function installPlugin(pluginSpec, installPath, logger) {
  const { spawn } = require('child_process');
  return new Promise((resolve, reject) => {
    const child = spawn('npm', ['install', pluginSpec, '--save-dev'], {
      cwd: installPath,
      stdio: 'pipe',
      shell: true,
    });

    let stderr = '';
    child.stderr.on('data', d => { stderr += d.toString(); });
    child.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`npm install failed: ${stderr}`));
    });
    child.on('error', reject);
  });
}

async function pluginCommand(options) {
  const {
    action = 'list',
    name = '',
    verbose = false,
    projectPath = process.cwd(),
  } = options;

  const logger = new Logger({ verbose });
  const config = new VBotConfig();

  switch (action) {
    case 'list': {
      const spinner = ora({ text: 'Loading plugins...', color: 'cyan' }).start();
      const plugins = config.get('plugins', []);
      spinner.stop();

      if (plugins.length === 0) {
        console.log();
        console.log(chalk.yellow('  No plugins installed.'));
        console.log(`  Run ${chalk.cyan('vbot plugin add <name>')} to install one.`);
        console.log();
        return [];
      }

      console.log();
      console.log(chalk.bold(`  Installed Plugins (${plugins.length})`));
      console.log(chalk.gray('  ─────────────────────────────'));
      console.log();

      for (const plugin of plugins) {
        console.log(`  ${chalk.cyan('•')} ${chalk.bold(plugin.name)}`);
        if (plugin.version) console.log(`    Version: ${plugin.version}`);
        if (plugin.description) console.log(`    ${plugin.description}`);
        if (plugin.source) console.log(`    Source: ${plugin.source}`);
        console.log();
      }
      return plugins;
    }

    case 'add': {
      validatePluginName(name);
      const spinner = ora({ text: `Adding plugin: ${name}...`, color: 'cyan' }).start();

      let pluginInfo;
      if (name.includes('/')) {
        pluginInfo = await fetchGitHubPlugin(name, logger);
      } else {
        pluginInfo = await fetchNpmPlugin(name, logger);
      }

      try {
        await installPlugin(name, projectPath, logger);
        spinner.succeed(`Installed ${pluginInfo.name}@${pluginInfo.version}`);
      } catch (err) {
        spinner.fail(`Installation failed: ${err.message}`);
        process.exit(1);
      }

      const plugins = config.get('plugins', []);
      const exists = plugins.find(p => p.name === pluginInfo.name);
      if (!exists) {
        plugins.push(pluginInfo);
        config.set('plugins', plugins);
      }

      console.log();
      console.log(chalk.green(`✓ Plugin "${pluginInfo.name}" added successfully!`));
      console.log(`  Update your ${chalk.cyan('.vbotrc.js')} to enable it.`);
      console.log();

      return pluginInfo;
    }

    case 'remove': {
      validatePluginName(name);
      const spinner = ora({ text: `Removing plugin: ${name}...`, color: 'cyan' }).start();

      const plugins = config.get('plugins', []);
      const idx = plugins.findIndex(p => p.name === name || p.name.includes(name));

      if (idx === -1) {
        spinner.fail(`Plugin "${name}" not found in config.`);
        process.exit(1);
      }

      const removed = plugins.splice(idx, 1)[0];
      config.set('plugins', plugins);
      spinner.succeed(`Removed ${removed.name}`);

      console.log();
      console.log(chalk.green(`✓ Plugin "${removed.name}" removed from config.`));
      console.log(`  Remember to also remove it from package.json.`);
      console.log();

      return removed;
    }

    case 'search': {
      if (!name) {
        logger.error('Search query required. Usage: vbot plugin search <query>');
        process.exit(1);
      }

      const spinner = ora({ text: `Searching for "${name}"...`, color: 'cyan' }).start();
      const results = await searchNpmPlugins(name, logger);
      spinner.stop();

      if (results.length === 0) {
        console.log();
        console.log(chalk.yellow(`  No plugins found for "${name}".`));
        console.log();
        return [];
      }

      console.log();
      console.log(chalk.bold(`  Search Results for "${name}"`));
      console.log(chalk.gray('  ─────────────────────────────'));
      console.log();

      for (const result of results) {
        console.log(`  ${chalk.cyan('•')} ${chalk.bold(result.name)} ${chalk.gray(`v${result.version}`)}`);
        if (result.description) console.log(`    ${result.description}`);
        if (result.link) console.log(`    ${chalk.gray(result.link)}`);
        console.log();
      }

      return results;
    }

    case 'info': {
      if (!name) {
        logger.error('Plugin name required. Usage: vbot plugin info <name>');
        process.exit(1);
      }

      const spinner = ora({ text: `Fetching info for ${name}...`, color: 'cyan' }).start();
      let info;
      try {
        if (name.includes('/')) {
          info = await fetchGitHubPlugin(name, logger);
        } else {
          info = await fetchNpmPlugin(name, logger);
        }
      } catch (err) {
        spinner.fail(err.message);
        process.exit(1);
      }
      spinner.stop();

      console.log();
      console.log(chalk.bold(`  Plugin: ${info.name}`));
      console.log(chalk.gray('  ─────────────────────────────'));
      console.log(`    Version      ${info.version}`);
      if (info.description) console.log(`    Description  ${info.description}`);
      if (info.author) console.log(`    Author       ${info.author}`);
      if (info.repository) console.log(`    Repository   ${info.repository}`);
      if (info.homepage) console.log(`    Homepage     ${info.homepage}`);
      if (info.license) console.log(`    License      ${info.license}`);
      if (info.keywords?.length) console.log(`    Keywords     ${info.keywords.join(', ')}`);
      if (info.downloads) console.log(`    Downloads    ${info.downloads}`);
      if (info.stars !== undefined) console.log(`    Stars        ${info.stars}`);
      console.log();

      return info;
    }

    case 'update': {
      const plugins = config.get('plugins', []);
      if (plugins.length === 0) {
        console.log(chalk.yellow('  No plugins to update.'));
        return [];
      }

      const spinner = ora({ text: 'Updating plugins...', color: 'cyan' }).start();
      for (const plugin of plugins) {
        try {
          await installPlugin(plugin.name, projectPath, logger);
          logger.success(`Updated ${plugin.name}`);
        } catch (err) {
          logger.error(`Failed to update ${plugin.name}: ${err.message}`);
        }
      }
      spinner.succeed('Plugin update complete');
      return plugins;
    }

    default:
      logger.error(`Unknown action: ${action}`);
      console.log(`  Supported actions: list, add, remove, search, info, update`);
      process.exit(1);
  }
}

module.exports = { pluginCommand };

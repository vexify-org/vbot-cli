'use strict';

const chalk = require('chalk');
const ora = require('ora');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { Logger, VBotConfig, loadConfig } = require('../utils/config');
const { checkConnectivity } = require('../utils/network');

function getSystemInfo() {
  return {
    platform: os.platform(),
    arch: os.arch(),
    nodeVersion: process.version,
    cpus: os.cpus().length,
    totalMemory: `${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
    freeMemory: `${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
    uptime: `${(os.uptime() / 3600).toFixed(2)} hours`,
    hostname: os.hostname(),
  };
}

function getProjectStatus(projectRoot, logger) {
  const pkgPath = path.join(projectRoot, 'package.json');
  const vbotrcPath = path.join(projectRoot, '.vbotrc.json');
  const deploymentsDir = path.join(projectRoot, '.vbot', 'deployments');

  const status = {
    hasPackageJson: fs.existsSync(pkgPath),
    hasVbotConfig: fs.existsSync(vbotrcPath),
    hasDeployments: fs.existsSync(deploymentsDir),
    deploymentCount: 0,
    lastDeployment: null,
    latestVersion: null,
  };

  if (status.hasPackageJson) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
      status.latestVersion = pkg.version;
      status.projectName = pkg.name;
      status.dependencies = Object.keys(pkg.dependencies || {});
      status.devDependencies = Object.keys(pkg.devDependencies || {});
    } catch (err) {
      logger.debug(`Failed to parse package.json: ${err.message}`);
    }
  }

  if (status.hasDeployments) {
    const files = fs.readdirSync(deploymentsDir)
      .filter(f => f.endsWith('.json'))
      .map(f => ({
        name: f,
        mtime: fs.statSync(path.join(deploymentsDir, f)).mtime,
      }))
      .sort((a, b) => b.mtime - a.mtime);

    status.deploymentCount = files.length;
    if (files.length > 0) {
      const last = JSON.parse(fs.readFileSync(path.join(deploymentsDir, files[0].name), 'utf-8'));
      status.lastDeployment = last;
    }
  }

  return status;
}

async function getRegistryStatus(config, logger) {
  const registry = config.get('registry', 'https://registry.npmjs.org');

  try {
    const response = await fetch(`${registry}/vbot-cli/latest`, {
      method: 'HEAD',
      timeout: 5000,
    });

    return {
      reachable: response.ok,
      registry,
      statusCode: response.status,
    };
  } catch (err) {
    return {
      reachable: false,
      registry,
      error: err.message,
    };
  }
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  return parts.join(' ') || '<1m';
}

async function statusCommand(options) {
  const {
    verbose = false,
    json = false,
    projectPath = process.cwd(),
  } = options;

  const logger = new Logger({ verbose });
  const config = new VBotConfig();

  const spinner = ora({ text: 'Gathering status...', color: 'cyan' }).start();

  const [sysInfo, projectStatus, registryStatus] = await Promise.all([
    Promise.resolve(getSystemInfo()),
    Promise.resolve(getProjectStatus(projectPath, logger)),
    getRegistryStatus(config, logger),
  ]);

  spinner.stop();

  const isOnline = await checkConnectivity();

  const status = {
    timestamp: new Date().toISOString(),
    online: isOnline,
    system: sysInfo,
    project: projectStatus,
    registry: registryStatus,
    config: {
      registry: config.get('registry'),
      plugins: config.get('plugins'),
      aliases: config.get('aliases'),
      cliVersion: config.get('version'),
    },
  };

  if (json) {
    console.log(JSON.stringify(status, null, 2));
    return status;
  }

  // Render human-readable output
  console.log();
  console.log(chalk.bold('  vbot status  '));
  console.log(chalk.gray('  ─────────────────────────────'));
  console.log();

  // System section
  console.log(chalk.bold.cyan('  System'));
  console.log(`    Platform    ${sysInfo.platform} / ${sysInfo.arch}`);
  console.log(`    Node.js     ${sysInfo.nodeVersion}`);
  console.log(`    CPUs        ${sysInfo.cpus}`);
  console.log(`    Memory      ${sysInfo.freeMemory} free / ${sysInfo.totalMemory} total`);
  console.log(`    Hostname    ${sysInfo.hostname}`);
  console.log(`    Uptime      ${sysInfo.uptime}`);
  console.log();

  // Project section
  console.log(chalk.bold.cyan('  Project'));
  if (status.project.hasPackageJson) {
    console.log(`    Name        ${chalk.green('✓')} ${projectStatus.projectName}@${projectStatus.latestVersion}`);
    console.log(`    Dependencies ${projectStatus.dependencies.length} packages`);
    console.log(`    DevDeps     ${projectStatus.devDependencies.length} packages`);
  } else {
    console.log(`    ${chalk.yellow('⚠')} No package.json found`);
  }

  if (status.project.hasVbotConfig) {
    console.log(`    VBot Config ${chalk.green('✓')} .vbotrc.json found`);
  }

  if (status.project.hasDeployments) {
    console.log(`    Deployments ${chalk.green('✓')} ${projectStatus.deploymentCount} record(s)`);
    if (projectStatus.lastDeployment) {
      const dep = projectStatus.lastDeployment;
      console.log(`    Last Deploy ${dep.timestamp} (${dep.environment})`);
      console.log(`    Regions     ${dep.regions.join(', ')}`);
    }
  } else {
    console.log(`    Deployments ${chalk.gray('-')} No deployments yet`);
  }
  console.log();

  // Network section
  console.log(chalk.bold.cyan('  Network'));
  console.log(`    Internet    ${isOnline ? chalk.green('✓ Connected') : chalk.red('✗ Offline')}`);
  console.log(`    Registry    ${registryStatus.reachable ? chalk.green('✓') : chalk.red('✗')} ${registryStatus.registry}`);
  if (registryStatus.statusCode) console.log(`    Registry HTTP ${registryStatus.statusCode}`);
  console.log();

  // CLI Config section
  console.log(chalk.bold.cyan('  CLI Config'));
  console.log(`    vbot-cli     v${status.config.cliVersion}`);
  console.log(`    Registry    ${status.config.registry}`);
  console.log(`    Plugins     ${status.config.plugins?.length || 0} loaded`);
  console.log(`    Aliases     ${Object.keys(status.config.aliases || {}).length} defined`);
  console.log();

  return status;
}

module.exports = { statusCommand, getSystemInfo, getProjectStatus };

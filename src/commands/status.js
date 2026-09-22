/**
 * status.js — System and project status dashboard
 */

import { Command } from 'commander';
import os from 'os';
import chalk from 'chalk';
import { readFileSync } from 'fs';
import { join } from 'path';


function getNodeVersion() {
  return process.version.replace('v', '');
}

function getPlatformInfo() {
  return {
    os: `${os.type()} ${os.release()}`,
    arch: os.arch(),
    cpus: os.cpus().length,
    memory: `${Math.round(os.freemem() / 1024 / 1024)}MB / ${Math.round(os.totalmem() / 1024 / 1024)}MB`,
    uptime: formatUptime(os.uptime()),
  };
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  return parts.join(' ') || '<1m';
}

function getProjectStatus(cwd) {
  try {
    const pkgPath = join(cwd, 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    return {
      name: pkg.name,
      version: pkg.version,
      hasBuild: !!(pkg.scripts && pkg.scripts.build),
      hasTest: !!(pkg.scripts && pkg.scripts.test),
    };
  } catch {
    return null;
  }
}

function checkNetwork() {
  // Simple connectivity check via dns
  try {
    const { dns } = require('dns');
    return new Promise((resolve) => {
      dns.lookup('github.com', (err) => {
        resolve(!err);
      });
    });
  } catch {
    return Promise.resolve(false);
  }
}

function formatRow(label, value, color = 'white') {
  const padded = label.padEnd(16);
  return `  ${chalk.dim('•')} ${chalk.cyan(padded)}  ${chalk[color](value)}`;
}

export const statusCommand = new Command('status')
  .description('Check system, project, and network status')
  .argument('[service]', 'Specific service to check (optional)')
  .option('-j, --json', 'Output status as JSON')
  .action(async (service, options) => {
    const platform = getPlatformInfo();
    const project = getProjectStatus(process.cwd());

    const statusData = {
      platform: {
        node: getNodeVersion(),
        ...platform,
      },
      project: project || 'No package.json found in current directory',
      timestamp: new Date().toISOString(),
    };

    if (options.json) {
      console.log(JSON.stringify(statusData, null, 2));
      return;
    }

    console.log(`\n  ${chalk.bold.cyan('╭── VBot Status ────────────────────╮')}`);

    console.log(`  ${chalk.bold('Platform')}`);
    console.log(formatRow('Node.js', `v${statusData.platform.node}`));
    console.log(formatRow('OS', statusData.platform.os));
    console.log(formatRow('Arch', statusData.platform.arch));
    console.log(formatRow('CPUs', `${statusData.platform.cpus}`));
    console.log(formatRow('Memory', statusData.platform.memory));
    console.log(formatRow('Uptime', statusData.platform.uptime));

    if (project) {
      console.log(`  ${chalk.bold('Project')}`);
      console.log(formatRow('Name', project.name));
      console.log(formatRow('Version', `v${project.version}`));
      console.log(formatRow('Build', project.hasBuild ? chalk.green('✓') : chalk.dim('—')));
      console.log(formatRow('Test', project.hasTest ? chalk.green('✓') : chalk.dim('—')));
    } else {
      console.log(`  ${chalk.bold('Project')}`);
      console.log(formatRow('Status', chalk.yellow('No package.json')));
    }

    console.log(`  ${chalk.bold('Time')}`);
    console.log(formatRow('Now', new Date().toLocaleString()));

    console.log(`  ${chalk.dim('╰────────────────────────────────────╯')}\n`);
  });

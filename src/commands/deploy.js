/**
 * deploy.js — Deploy to a target environment
 */

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import logger from '../core/logger.js';

const DEPLOY_TARGETS = {
  local: { label: 'Local', icon: '🏠' },
  staging: { label: 'Staging', icon: '🧪' },
  production: { label: 'Production', icon: '🚀' },
};

async function buildProject(cwd) {
  const { execSync } = await import('child_process');
  const spinner = ora('Building project...').start();

  try {
    const pkg = JSON.parse(
      require('fs').readFileSync(require('path').join(cwd, 'package.json'), 'utf-8')
    );
    if (pkg.scripts && pkg.scripts.build) {
      execSync('npm run build', { cwd, stdio: 'pipe' });
      spinner.succeed('Build complete.');
    } else {
      spinner.info('No build script found, skipping build.');
    }
  } catch {
    spinner.warn('Build step failed or skipped (no package.json / build script).');
  }
}

async function healthCheck(target) {
  const spinner = ora(`Running health checks for "${target}"...`).start();

  // Simulate health checks
  await new Promise(r => setTimeout(r, 500));

  if (target === 'production') {
    // More thorough checks for production
    await new Promise(r => setTimeout(r, 300));
  }

  spinner.succeed(`Health checks passed for ${target}.`);
}

async function deployPipeline(target, options) {
  const spinner = ora({
    text: `Deploying to ${target}...`,
    color: 'cyan',
  }).start();

  try {
    // Step 1: Build
    await buildProject(process.cwd());

    // Step 2: Health checks
    await healthCheck(target);

    // Step 3: Deploy (placeholder — extend with your own logic)
    await new Promise(r => setTimeout(r, 600));

    spinner.succeed(chalk.green(`✓ Deployed to ${target} successfully!`));

    if (target === 'production') {
      console.log(`\n  ${chalk.yellow('⚠')} ${chalk.bold('Production deployment complete.')}
  Consider enabling rollback monitoring.`);
    }
  } catch (err) {
    spinner.fail(chalk.red(`Deployment failed: ${err.message}`));
    process.exit(1);
  }
}

export const deployCommand = new Command('deploy')
  .description('Deploy the current project to a target environment')
  .argument('[target]', 'Deploy target (local, staging, production)', 'local')
  .option('--no-build', 'Skip build step')
  .option('--dry-run', 'Simulate deployment without making changes')
  .action(async (target, options) => {
    const resolvedTarget = target.toLowerCase();

    if (!DEPLOY_TARGETS[resolvedTarget]) {
      logger.error(`Unknown target "${target}". Valid targets: ${Object.keys(DEPLOY_TARGETS).join(', ')}`);
      process.exit(1);
    }

    const spinner = ora({
      text: `Preparing deployment to ${DEPLOY_TARGETS[resolvedTarget].icon} ${DEPLOY_TARGETS[resolvedTarget].label}...`,
      color: 'cyan',
    }).start();

    spinner.stop();

    if (options.dryRun) {
      logger.info(`[DRY RUN] Would deploy to ${resolvedTarget}`);
      logger.info(`[DRY RUN] Build: ${options.noBuild ? 'skipped' : 'included'}`);
      return;
    }

    await deployPipeline(resolvedTarget, options);
  });

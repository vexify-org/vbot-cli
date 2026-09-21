'use strict';

const chalk = require('chalk');
const ora = require('ora');
const path = require('path');
const fs = require('fs');
const { Logger, VBotConfig, loadConfig, validateProject } = require('../utils/config');
const { runBuild } = require('../utils/build');
const { checkHealth, checkConnectivity } = require('../utils/network');

const SUPPORTED_ENVS = ['development', 'staging', 'production', 'preview'];
const DEFAULT_REGIONS = ['us-east-1', 'eu-west-1', 'ap-southeast-1', 'cn-hongkong'];

function parseDeployConfig(projectRoot, env) {
  const vbotrc = loadConfig();
  const projectPkg = validateProject(projectRoot);

  const defaultConfig = {
    buildCommand: 'npm run build',
    outputDir: 'dist',
    env: {},
    regions: ['us-east-1'],
    timeout: 300000,
    rollbackOnFailure: false,
    healthCheck: true,
    preDeploy: [],
    postDeploy: [],
  };

  const merged = { ...defaultConfig, ...vbotrc };

  if (merged.outputDir && !path.isAbsolute(merged.outputDir)) {
    merged.outputDir = path.resolve(projectRoot, merged.outputDir);
  }

  return {
    ...merged,
    projectName: projectPkg.name,
    projectVersion: projectPkg.version,
    environment: env,
    timestamp: new Date().toISOString(),
  };
}

function validateEnvironment(env) {
  if (!SUPPORTED_ENVS.includes(env)) {
    throw new Error(
      `Unknown environment "${env}". Supported: ${SUPPORTED_ENVS.join(', ')}`
    );
  }
}

function validateRegion(region) {
  if (!DEFAULT_REGIONS.includes(region)) {
    throw new Error(
      `Unknown region "${region}". Supported: ${DEFAULT_REGIONS.join(', ')}`
    );
  }
}

function gatherEnvironmentVariables(env) {
  const envFile = path.join(process.cwd(), `.env.${env}`);
  const localEnvFile = path.join(process.cwd(), `.env.${env}.local`);
  const defaults = {};

  for (const file of [envFile, localEnvFile]) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf-8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) return;
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
        defaults[key] = val;
      });
    }
  }

  return defaults;
}

function collectArtifacts(projectRoot, outputDir, logger) {
  if (!fs.existsSync(outputDir)) {
    throw new Error(`Build output directory "${outputDir}" not found. Run build first.`);
  }

  const artifacts = [];
  const ignorePatterns = ['.git', 'node_modules', '.DS_Store', '.gitkeep'];

  function walkDir(dir, base = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (ignorePatterns.includes(entry.name)) continue;
      const relPath = path.join(base, entry.name);
      if (entry.isDirectory()) {
        walkDir(path.join(dir, entry.name), relPath);
      } else {
        const fullPath = path.join(dir, entry.name);
        const stats = fs.statSync(fullPath);
        artifacts.push({ path: relPath, size: stats.size, fullPath });
      }
    }
  }

  walkDir(outputDir);
  logger.debug(`Collected ${artifacts.length} artifact(s) from ${outputDir}`);

  const totalSize = artifacts.reduce((acc, a) => acc + a.size, 0);
  logger.info(`Total artifact size: ${(totalSize / 1024).toFixed(2)} KB`);

  return artifacts;
}

async function simulateUpload(artifacts, region, config, logger, spinner) {
  const uploadDelay = Math.min(artifacts.length * 100 + Math.random() * 200, 500);
  await new Promise(resolve => setTimeout(resolve, uploadDelay));

  logger.debug(`Uploaded ${artifacts.length} file(s) to region ${region}`);
  return {
    region,
    uploadedFiles: artifacts.length,
    cdnUrl: `https://cdn.${region}.vbot.app/${config.projectName}/${config.projectVersion}`,
    deploymentId: `dep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
  };
}

async function runHealthChecks(urls, logger) {
  const results = [];
  for (const url of urls) {
    try {
      const result = await checkHealth(url, logger);
      results.push({ url, ...result });
    } catch (err) {
      results.push({ url, healthy: false, error: err.message });
    }
  }
  return results;
}

async function rollback(deploymentId, logger) {
  logger.warn(`Rolling back deployment ${deploymentId}...`);
  await new Promise(resolve => setTimeout(resolve, 300));
  logger.success('Rollback completed (simulated)');
}

async function deployCommand(options) {
  const {
    env = 'production',
    region = 'us-east-1',
    build: shouldBuild = true,
    skipBuild = false,
    skipHealthCheck = false,
    noRollback = false,
    dryRun = false,
    verbose = false,
    projectPath = process.cwd(),
  } = options;

  const logger = new Logger({ verbose });

  logger.info(`${chalk.bold('vbot deploy')} — environment: ${chalk.cyan(env)}`);

  // Validate inputs
  validateEnvironment(env);
  if (region) validateRegion(region);

  const config = parseDeployConfig(projectPath, env);

  if (dryRun) {
    logger.warn('DRY RUN — no actual deployment will occur');
    console.log(chalk.gray(JSON.stringify(config, null, 2)));
    return { config, dryRun: true };
  }

  // Connectivity check
  const spinner = ora({ text: 'Checking connectivity...', color: 'cyan' }).start();
  const isOnline = await checkConnectivity();
  if (!isOnline) {
    spinner.fail('No network connectivity. Please check your connection.');
    process.exit(1);
  }
  spinner.succeed('Network connectivity OK');

  // Gather env vars
  const envVars = gatherEnvironmentVariables(env);
  logger.debug(`Loaded ${Object.keys(envVars).length} environment variable(s)`);

  // Build
  let buildResult = null;
  if (!skipBuild) {
    if (shouldBuild) {
      const buildSpinner = ora({ text: 'Running build...', color: 'cyan' }).start();
      try {
        buildResult = await runBuild(config.buildCommand, envVars, logger);
        if (buildResult.success) {
          buildSpinner.succeed(`Build completed in ${buildResult.duration}ms`);
        } else {
          buildSpinner.fail(`Build failed: ${buildResult.error}`);
          if (!noRollback) process.exit(1);
        }
      } catch (err) {
        buildSpinner.fail(`Build error: ${err.message}`);
        if (!noRollback) process.exit(1);
      }
    } else {
      logger.info('Skipping build step (--no-build)');
    }
  } else {
    logger.info('Skipping build step (--skip-build)');
  }

  // Collect artifacts
  const artifactSpinner = ora({ text: 'Collecting artifacts...', color: 'cyan' }).start();
  let artifacts = [];
  try {
    artifacts = collectArtifacts(projectPath, config.outputDir, logger);
    artifactSpinner.succeed(`Collected ${artifacts.length} artifact(s)`);
  } catch (err) {
    artifactSpinner.fail(err.message);
    process.exit(1);
  }

  // Upload
  const regions = region ? [region] : config.regions;
  const deployments = [];

  for (const r of regions) {
    const uploadSpinner = ora({ text: `Uploading to ${r}...`, color: 'cyan' }).start();
    try {
      const result = await simulateUpload(artifacts, r, config, logger, uploadSpinner);
      deployments.push(result);
      uploadSpinner.succeed(`Deployed to ${r}: ${result.cdnUrl}`);
    } catch (err) {
      uploadSpinner.fail(`Upload to ${r} failed: ${err.message}`);
      if (!noRollback) await rollback(null, logger);
      process.exit(1);
    }
  }

  // Health checks
  if (!skipHealthCheck && config.healthCheck) {
    const healthUrls = deployments.map(d => `${d.cdnUrl}/`);
    const healthSpinner = ora({ text: 'Running health checks...', color: 'cyan' }).start();

    const healthResults = await runHealthChecks(healthUrls, logger);
    const allHealthy = healthResults.every(r => r.healthy);

    if (allHealthy) {
      healthSpinner.succeed(`All ${healthResults.length} health check(s) passed`);
    } else {
      healthSpinner.warn('Some health checks failed:');
      healthResults.forEach(r => {
        if (!r.healthy) {
          console.log(`  ${chalk.red('✗')} ${r.url}: ${r.error || 'unreachable'}`);
        } else {
          console.log(`  ${chalk.green('✓')} ${r.url}`);
        }
      });
      if (!noRollback) {
        logger.error('Health checks failed. Rolling back...');
        await rollback(deployments[0]?.deploymentId, logger);
        process.exit(1);
      }
    }
  }

  // Save deployment record
  const deploymentRecord = {
    projectName: config.projectName,
    environment: env,
    version: config.projectVersion,
    timestamp: new Date().toISOString(),
    regions: regions,
    deployments,
    buildDuration: buildResult?.duration,
  };

  const deploymentsDir = path.join(projectPath, '.vbot', 'deployments');
  fs.mkdirSync(deploymentsDir, { recursive: true });
  const recordFile = path.join(deploymentsDir, `${Date.now()}.json`);
  fs.writeFileSync(recordFile, JSON.stringify(deploymentRecord, null, 2));

  // Summary
  console.log();
  console.log(chalk.bold.green('✓ Deployment complete!'));
  console.log();
  deployments.forEach(d => {
    console.log(`  ${chalk.gray('Region:')} ${chalk.cyan(d.region)}`);
    console.log(`  ${chalk.gray('URL:   ')} ${chalk.blue.underline(d.cdnUrl)}`);
    console.log(`  ${chalk.gray('ID:    ')} ${d.deploymentId}`);
    console.log();
  });

  return deploymentRecord;
}

module.exports = { deployCommand };

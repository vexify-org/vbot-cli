'use strict';

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { Logger } = require('./logger');

const VALID_BUNDLERS = ['webpack', 'vite', 'rollup', 'esbuild', 'tsc'];

function detectBundler(projectRoot) {
  const indicators = {
    'webpack.config.js': 'webpack',
    'vite.config.js': 'vite',
    'vite.config.ts': 'vite',
    'rollup.config.js': 'rollup',
    'esbuild.config.js': 'esbuild',
    'tsconfig.json': 'tsc',
  };

  for (const [file, bundler] of Object.entries(indicators)) {
    if (fs.existsSync(path.join(projectRoot, file))) {
      return bundler;
    }
  }

  return null;
}

function runBuild(buildCommand, envVars = {}, logger) {
  const loggerInstance = logger || new Logger();

  return new Promise((resolve, reject) => {
    const parts = buildCommand.trim().split(/\s+/);
    const cmd = parts[0];
    const args = parts.slice(1);

    loggerInstance.debug(`Running build: ${buildCommand}`);
    loggerInstance.debug(`CWD: ${process.cwd()}`);

    const startTime = Date.now();
    const child = spawn(cmd, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true,
      env: { ...process.env, ...envVars },
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', d => {
      const text = d.toString();
      stdout += text;
      process.stdout.write(text);
    });

    child.stderr.on('data', d => {
      const text = d.toString();
      stderr += text;
      // Simple colored stderr
      process.stderr.write(`\x1b[31m${text}\x1b[0m`);
    });

    child.on('error', err => {
      if (err.code === 'ENOENT') {
        reject(new Error(
          `Build command not found: "${cmd}". ` +
          `Make sure the command is installed and available in PATH.`
        ));
      } else {
        reject(err);
      }
    });

    child.on('close', code => {
      const duration = Date.now() - startTime;

      if (code === 0) {
        resolve({
          success: true,
          code,
          duration,
          stdout,
          stderr,
        });
      } else {
        resolve({
          success: false,
          code,
          duration,
          stdout,
          stderr,
          error: `Build exited with code ${code}`,
        });
      }
    });
  });
}

async function build(options = {}) {
  const {
    buildCommand,
    projectRoot = process.cwd(),
    envVars = {},
    bundler: preferredBundler,
    watch = false,
    verbose = false,
  } = options;

  const logger = new Logger({ verbose });

  // Detect bundler if not specified
  const detectedBundler = preferredBundler || detectBundler(projectRoot);
  if (detectedBundler) {
    logger.debug(`Detected bundler: ${detectedBundler}`);
  }

  // Default build command if not provided
  const command = buildCommand || getDefaultBuildCommand(detectedBundler);
  if (!command) {
    throw new Error(
      'No build command specified. Add a "build" script to package.json or pass --build-command.'
    );
  }

  logger.info(`Building with command: ${chalk.bold(command)}`);

  if (watch) {
    const watcher = spawn(command, [], {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, ...envVars },
    });
    return new Promise(() => {}); // Keep running in watch mode
  }

  const result = await runBuild(command, envVars, logger);

  if (result.success) {
    logger.success(`Build completed in ${result.duration}ms`);
  } else {
    logger.error(`Build failed after ${result.duration}ms: ${result.error}`);
    if (result.stderr) {
      logger.debug('Build stderr:');
      logger.debug(result.stderr);
    }
  }

  return result;
}

function getDefaultBuildCommand(bundler) {
  switch (bundler) {
    case 'webpack': return 'webpack --mode production';
    case 'vite': return 'vite build';
    case 'rollup': return 'rollup -c';
    case 'esbuild': return 'esbuild src/index.js --bundle --outdir=dist';
    case 'tsc': return 'tsc';
    default: return null;
  }
}

function cleanDist(outputDir, logger) {
  const fs = require('fs');
  const path = require('path');
  const loggerInstance = logger || new Logger();

  if (fs.existsSync(outputDir)) {
    loggerInstance.debug(`Cleaning output directory: ${outputDir}`);
    fs.rmSync(outputDir, { recursive: true, force: true });
  }
}

module.exports = { build, runBuild, detectBundler, cleanDist };

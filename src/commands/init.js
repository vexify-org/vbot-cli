/**
 * init.js — Initialize a new project from template
 */

import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';
import logger from '../core/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = path.join(__dirname, '..', 'templates', 'default');

const TEMPLATE_FILES = {
  'package.json': JSON.stringify({
    name: '{{name}}',
    version: '0.1.0',
    description: 'A VBot-powered project',
    main: 'src/index.js',
    type: 'module',
    scripts: {
      start: 'node src/index.js',
      dev: 'node --watch src/index.js',
      test: 'node --test',
    },
    keywords: [],
    author: '',
    license: 'MIT',
  }, null, 2),
  'src/index.js': `// {{name}} — Entry point\nconsole.log('Hello from {{name}}!');\n`,
  '.gitignore': `node_modules/\ndist/\n.env\n*.log\n`,
  'README.md': `# {{name}}\n\nA VBot-powered project.\n\n## Getting Started\n\n\`\`\`bash\nnpm install\nnpm start\n\`\`\`\n`,
};

export const initCommand = new Command('init')
  .description('Initialize a new project from a template')
  .argument('[name]', 'Project name (defaults to current directory name)')
  .option('-t, --template <template>', 'Template name', 'default')
  .option('--no-git', 'Skip git init')
  .action(async (name, options) => {
    const targetName = name || path.basename(process.cwd());
    const destDir = path.join(process.cwd(), name ? targetName : '');

    if (fs.existsSync(destDir) && destDir !== process.cwd()) {
      logger.error(`Directory "${targetName}" already exists.`);
      process.exit(1);
    }

    const spinner = ora({
      text: `Scaffolding project "${targetName}"...`,
      color: 'cyan',
    }).start();

    try {
      if (destDir !== process.cwd()) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      const resolvedDir = destDir === process.cwd() ? destDir : destDir;

      for (const [file, content] of Object.entries(TEMPLATE_FILES)) {
        const filePath = path.join(resolvedDir, file);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });

        const filled = content
          .replace(/\{\{name\}\}/g, targetName);

        fs.writeFileSync(filePath, filled);
      }

      spinner.succeed(chalk.green(`Project "${targetName}" scaffolded successfully!`));

      console.log(`\n  ${chalk.bold('Next steps:')}`);
      console.log(`  ${chalk.cyan('cd')} ${name ? targetName : '.'}`);
      console.log(`  ${chalk.cyan('npm install')}`);
      console.log(`  ${chalk.cyan('npm start')}`);

      if (!options.noGit && !fs.existsSync(path.join(resolvedDir, '.git'))) {
        try {
          execSync('git init', { cwd: resolvedDir, stdio: 'pipe' });
          logger.info('Git repository initialized.');
        } catch {
          logger.warn('Git not available, skipping init.');
        }
      }
    } catch (err) {
      spinner.fail(chalk.red(`Scaffold failed: ${err.message}`));
      process.exit(1);
    }
  });

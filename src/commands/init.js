'use strict';

const chalk = require('chalk');
const ora = require('ora');
const path = require('path');
const fs = require('fs');
const { Logger, VBotConfig, loadConfig } = require('../utils/config');

function camelCase(str) {
  return str.replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '');
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function sanitizeName(name) {
  return name.replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
}

function generateTemplateVars(name, options = {}) {
  const safeName = sanitizeName(name);
  const camelName = camelCase(safeName);
  const PascalName = capitalize(camelName);

  return {
    name: safeName,
    className: PascalName,
    camelName,
    description: options.description || `A project created with ${safeName}`,
    author: options.author || '',
    email: options.email || '',
    year: new Date().getFullYear(),
    template: options.template || 'default',
    typescript: options.typescript || false,
  };
}

function renderTemplate(template, vars) {
  return template
    .replace(/\{\{name\}\}/g, vars.name)
    .replace(/\{\{className\}\}/g, vars.className)
    .replace(/\{\{camelName\}\}/g, vars.camelName)
    .replace(/\{\{description\}\}/g, vars.description)
    .replace(/\{\{author\}\}/g, vars.author)
    .replace(/\{\{email\}\}/g, vars.email)
    .replace(/\{\{year\}\}/g, vars.year)
    .replace(/\{\{template\}\}/g, vars.template)
    .replace(/\{\{ts\}\}/g, vars.typescript ? '.ts' : '.js');
}

const TEMPLATE_PACKAGE_JSON = `{
  "name": "{{name}}",
  "version": "1.0.0",
  "description": "{{description}}",
  "main": "src/index.js",
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "test": "jest",
    "lint": "eslint src/"
  },
  "keywords": ["vbot"],
  "author": "{{author}}",
  "license": "MIT",
  "dependencies": {},
  "devDependencies": {
    "nodemon": "^3.0.0",
    "jest": "^29.0.0",
    "eslint": "^8.0.0"
  }
}`;

const TEMPLATE_INDEX_JS = `/**
 * {{className}} - {{description}}
 * Author: {{author}} <{{email}}>
 * Year: {{year}}
 */

'use strict';

class {{className}} {
  constructor(options = {}) {
    this.name = '{{name}}';
    this.version = '1.0.0';
    this.options = options;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) {
      throw new Error('{{className}} has already been initialized.');
    }
    console.log('[{{className}}] Initializing...');
    this.initialized = true;
    return this;
  }

  async start() {
    if (!this.initialized) {
      await this.init();
    }
    console.log('[{{className}}] Started successfully!');
    return this;
  }

  async stop() {
    console.log('[{{className}}] Stopping...');
    this.initialized = false;
    return this;
  }

  execute(action, ...args) {
    if (!this.initialized) {
      throw new Error('{{className}} is not initialized. Call start() first.');
    }
    console.log('[{{className}}] Executing:', action, args);
    return { action, args, timestamp: Date.now() };
  }
}

module.exports = {{className}};
`;

const TEMPLATE_README = `# {{name}}

{{description}}

## Quick Start

\`\`\`bash
# Install dependencies
npm install

# Run the project
npm start

# Development mode with hot reload
npm run dev

# Run tests
npm test
\`\`\`

## Project Structure

\`\`\`
{{name}}/
├── src/
│   └── index.js       # Main entry point
├── test/              # Test files
├── package.json
└── README.md
\`\`\`

## License

MIT © {{year}} {{author}}
`;

const TEMPLATE_DOT_GITIGNORE = `node_modules/
dist/
build/
coverage/
.env
.env.local
*.log
.DS_Store
.cache/
`;

const TEMPLATE_JEST_CONFIG = `module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/**/*.js', '!src/**/*.test.js'],
  testMatch: ['**/test/**/*.test.js'],
  verbose: true,
};
`;

const TEMPLATE_ESLINT = `module.exports = {
  env: { node: true, es2022: true },
  extends: 'eslint:recommended',
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  rules: {
    'no-unused-vars': 'warn',
    'no-console': 'off',
    'no-debugger': 'error',
  },
};
`;

function createProjectFiles(projectPath, vars) {
  const srcDir = path.join(projectPath, 'src');
  const testDir = path.join(projectPath, 'test');

  const files = {
    'package.json': renderTemplate(TEMPLATE_PACKAGE_JSON, vars),
    'src/index.js': renderTemplate(TEMPLATE_INDEX_JS, vars),
    'README.md': renderTemplate(TEMPLATE_README, vars),
    '.gitignore': renderTemplate(TEMPLATE_DOT_GITIGNORE, vars),
    'jest.config.js': TEMPLATE_JEST_CONFIG,
    '.eslintrc.js': TEMPLATE_ESLINT,
  };

  for (const [filePath, content] of Object.entries(files)) {
    const fullPath = path.join(projectPath, filePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content, 'utf-8');
  }

  // Create test file
  const testContent = `'use strict';

const ${vars.className} = require('../src/index');

describe('${vars.className}', () => {
  let instance;

  beforeEach(() => {
    instance = new ${vars.className}();
  });

  afterEach(async () => {
    if (instance) await instance.stop();
  });

  test('should have correct name', () => {
    expect(instance.name).toBe('${vars.name}');
  });

  test('should have correct version', () => {
    expect(instance.version).toBe('1.0.0');
  });

  test('should initialize successfully', async () => {
    await expect(instance.init()).resolves.toBe(instance);
    expect(instance.initialized).toBe(true);
  });

  test('should throw if initialized twice', async () => {
    await instance.init();
    await expect(instance.init()).rejects.toThrow('already been initialized');
  });

  test('should start and stop', async () => {
    await expect(instance.start()).resolves.toBe(instance);
    await expect(instance.stop()).resolves.toBe(instance);
  });

  test('should execute action when initialized', async () => {
    await instance.start();
    const result = instance.execute('test', 1, 2, 3);
    expect(result.action).toBe('test');
    expect(result.args).toEqual([1, 2, 3]);
    expect(result.timestamp).toBeDefined();
  });

  test('should throw when executing without initialization', () => {
    expect(() => instance.execute('test')).toThrow('not initialized');
  });
});
`;
  fs.writeFileSync(path.join(testDir, 'index.test.js'), testContent, 'utf-8');

  // Create .gitkeep for empty directories
  fs.writeFileSync(path.join(testDir, '.gitkeep'), '', 'utf-8');
}

async function fetchRemoteTemplate(templateName, logger) {
  const config = new VBotConfig();
  const registry = config.get('registry', 'https://registry.npmjs.org');
  const url = `${registry}/vbot-template-${templateName}/latest`;

  try {
    const response = await fetch(url, { timeout: 10000 });
    if (!response.ok) {
      logger.warn(`Template "${templateName}" not found in registry, using default`);
      return null;
    }
    const data = await response.json();
    return data;
  } catch (err) {
    logger.warn(`Failed to fetch template: ${err.message}, using default`);
    return null;
  }
}

async function initCommand(options) {
  const {
    name = 'my-vbot-project',
    template = 'default',
    description = '',
    author = '',
    email = '',
    typescript = false,
    force = false,
    verbose = false,
  } = options;

  const logger = new Logger({ verbose });
  const projectPath = path.resolve(process.cwd(), name);

  logger.info(`Initializing vbot project: ${chalk.bold(name)}`);

  // Validate project name
  if (!/^[a-z0-9-]+$/.test(name)) {
    logger.error('Project name must be lowercase alphanumeric with hyphens only.');
    logger.info('Example: my-project, my_app is not allowed');
    process.exit(1);
  }

  // Check if directory already exists
  if (fs.existsSync(projectPath)) {
    if (!force) {
      logger.error(`Directory "${name}" already exists. Use --force to overwrite.`);
      process.exit(1);
    }
    logger.warn(`Overwriting existing directory "${name}"...`);
  }

  // Fetch remote template if specified
  let activeTemplate = template;
  if (template !== 'default') {
    const remoteTemplate = await fetchRemoteTemplate(template, logger);
    if (remoteTemplate) {
      activeTemplate = remoteTemplate.name;
    }
  }

  const vars = generateTemplateVars(name, { description, author, email, template: activeTemplate, typescript });

  // Generate project files
  const spinner = ora({
    text: 'Creating project files...',
    color: 'cyan',
  }).start();

  try {
    createProjectFiles(projectPath, vars);
    spinner.succeed('Project files created successfully!');
  } catch (err) {
    spinner.fail(`Failed to create project: ${err.message}`);
    process.exit(1);
  }

  // Save project config
  const projectConfig = {
    name: vars.name,
    template: activeTemplate,
    version: '1.0.0',
    vbotVersion: require('../package.json').version,
    createdAt: new Date().toISOString(),
  };
  const configPath = path.join(projectPath, '.vbotrc.json');
  fs.writeFileSync(configPath, JSON.stringify(projectConfig, null, 2), 'utf-8');

  // Display summary
  console.log();
  console.log(chalk.bold.green('✓ Project initialized successfully!'));
  console.log();
  console.log(chalk.gray('  Project:'), chalk.cyan(vars.name));
  console.log(chalk.gray('  Path:   '), chalk.cyan(projectPath));
  console.log(chalk.gray('  Template:'), chalk.cyan(activeTemplate));
  if (vars.description) console.log(chalk.gray('  Desc:  '), vars.description);
  console.log();
  console.log('  Next steps:');
  console.log(`    ${chalk.bold('$ cd', name)}`);
  console.log(`    ${chalk.bold('$ npm install')}`);
  console.log(`    ${chalk.bold('$ npm start')}`);
  console.log();

  return { projectPath, vars, projectConfig };
}

module.exports = { initCommand, generateTemplateVars, renderTemplate };

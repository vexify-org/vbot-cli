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
  // Fixed: put hyphen at end of char class to treat as literal, not range
  return name.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();
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
    "test": "jest"
  },
  "keywords": ["vbot"],
  "author": "{{author}}",
  "license": "MIT",
  "dependencies": {},
  "devDependencies": {
    "nodemon": "^3.0.0",
    "jest": "^29.0.0"
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
      throw new Error('{{className}} must be initialized before starting.');
    }
    console.log('[{{className}}] Starting...');
    return this;
  }

  stop() {
    console.log('[{{className}}] Stopped.');
  }
}

module.exports = {{className}};
`;

const TEMPLATE_GITIGNORE = `# Dependencies
node_modules/

# Build outputs
dist/
build/

# Logs
*.log
npm-debug.log*

# Environment
.env
.env.local
.env.*.local

# Editor
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Test coverage
coverage/
`;

const TEMPLATE_README = `# {{className}}

{{description}}

## Install

\`\`\`bash
npm install
\`\`\`

## Usage

\`\`\`javascript
const {{className}} = require('./src/index.js');

const app = new {{className}}();
app.init().then(() => app.start());
\`\`\`

## License

MIT © {{year}} {{author}}
`;

module.exports = {
  camelCase,
  capitalize,
  sanitizeName,
  generateTemplateVars,
  renderTemplate,
  TEMPLATE_PACKAGE_JSON,
  TEMPLATE_INDEX_JS,
  TEMPLATE_GITIGNORE,
  TEMPLATE_README,
};

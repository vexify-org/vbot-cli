# vbot-cli

> Production-grade CLI framework for modern JavaScript

**vbot-cli** is a full-featured CLI tool framework that gives you everything you need to build powerful command-line tools: argument parsing, colored output, progress animations, plugin system, configuration management, and more.

## Features

- 🚀 **Full CLI framework** — commander.js-based with subcommands, options, and argument parsing
- 🎨 **Beautiful output** — chalk-powered colors, ora loading spinners, and formatted tables
- 🔌 **Plugin system** — load, enable, disable, and manage plugins with hooks
- ⚙️ **Configuration management** — `.vbotrc` / `.vbotrc.js` / `vbot.config.js` support
- 📦 **Scaffold projects** — `vbot init` generates complete project templates
- 🚢 **Deploy pipelines** — `vbot deploy` with build, health checks, and multi-region support
- 🔍 **Status dashboard** — `vbot status` shows system, project, and network info at a glance
- 📚 **Comprehensive help** — auto-generated help with examples

## Quick Start

```bash
# Install globally
npm install -g vbot-cli

# Initialize a new project
vbot init my-project

# Navigate to project
cd my-project

# Run it
npm start
```

## Commands

### `vbot init [name]`

Initialize a new vbot project.

```bash
vbot init api-service
vbot init web-app --template typescript --description "My web app"
vbot init admin-panel --author "Jane" --email jane@example.com
```

Options:
- `-t, --template <name>` — template name (default: `default`)
- `-d, --description <text>` — project description
- `-a, --author <name>` — author name
- `-e, --email <email>` — author email
- `--typescript` — use TypeScript template
- `-f, --force` — overwrite existing directory

### `vbot deploy`

Deploy the current project to a target environment.

```bash
vbot deploy --env production
vbot deploy -e staging -r eu-west-1
vbot deploy --dry-run
```

Options:
- `-e, --env <env>` — environment: `development`, `staging`, `production`, `preview`
- `-r, --region <region>` — target region
- `-b, --build` — run build before deploying (default: true)
- `--skip-build` — skip the build step
- `--skip-health-check` — skip post-deploy health checks
- `--dry-run` — validate config without deploying
- `--no-rollback` — do not rollback on failure

### `vbot status`

Show status of the current project and environment.

```bash
vbot status
vbot status --json
vbot status --verbose
```

### `vbot plugin`

Manage vbot plugins.

```bash
vbot plugin list           # List installed plugins
vbot plugin add <name>    # Install a plugin
vbot plugin remove <name> # Remove a plugin
vbot plugin search <query> # Search registry
vbot plugin info <name>    # Show plugin details
vbot plugin update         # Update all plugins
```

### `vbot build`

Build the current project.

```bash
vbot build
vbot build --watch
vbot build --bundler vite
```

## Configuration

vbot-cli reads config from these files (in order of priority):

1. `.vbotrc.json` — JSON config
2. `.vbotrc.js` — JavaScript config (exports object or function)
3. `.vbotrc` — INI-style config
4. `vbot.config.js` — JavaScript config module

Example `.vbotrc.js`:

```js
module.exports = {
  registry: 'https://registry.npmjs.org',
  plugins: ['@vbot/analytics'],
  buildCommand: 'npm run build',
  outputDir: 'dist',
  regions: ['us-east-1', 'eu-west-1'],
};
```

## Plugin System

Plugins extend vbot-cli's functionality. A plugin is any NPM package that exports a class with an `init` method:

```js
// my-plugin/index.js
class MyPlugin {
  constructor() {
    this.name = 'my-plugin';
    this.version = '1.0.0';
  }

  async init(logger) {
    this.logger = logger;
    this.logger.success('MyPlugin loaded!');
    return this;
  }

  async activate() { /* called on plugin load */ }
  async deactivate() { /* called on plugin unload */ }
}

module.exports = MyPlugin;
```

### Hooks

Plugins can register hooks:

```js
this.registerHook('preCommand', async (ctx) => {
  console.log('About to run:', ctx.command);
});
this.registerHook('postCommand', async (ctx) => {
  console.log('Finished:', ctx.command);
});
```

## Architecture

```
vbot-cli/
├── bin/
│   └── vbot.js          # CLI entry point (shebang + commander)
├── src/
│   ├── index.js         # VBot app class
│   ├── commands/
│   │   ├── index.js     # Command exports
│   │   ├── init.js      # vbot init — project scaffolding
│   │   ├── deploy.js    # vbot deploy — deployment pipeline
│   │   ├── status.js    # vbot status — status dashboard
│   │   └── plugin.js    # vbot plugin — plugin management
│   ├── utils/
│   │   ├── logger.js    # Colorful structured logger
│   │   ├── config.js    # Config loading + VBotConfig class
│   │   ├── network.js   # HTTP utilities + health checks
│   │   └── build.js     # Build orchestration
│   └── plugin/
│       └── manager.js    # Plugin lifecycle + hook system
├── package.json
└── test/
```

## License

MIT © 2024 VBot Team

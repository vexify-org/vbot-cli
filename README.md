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

## Install

```bash
npm install -g vbot-cli
```

Or run directly:

```bash
npx vbot-cli <command>
```

## Commands

### `vbot init [name]`
Initialize a new project from a template.

```bash
vbot init my-project        # Scaffold in ./my-project/
vbot init                   # Scaffold in current directory
vbot init my-project --no-git
```

### `vbot deploy [target]`
Deploy to local, staging, or production.

```bash
vbot deploy local           # Deploy locally
vbot deploy staging         # Deploy to staging
vbot deploy production      # Deploy to production
vbot deploy --dry-run       # Simulate deployment
```

### `vbot status [service]`
Check system, project, and network status.

```bash
vbot status                 # Full status dashboard
vbot status --json          # JSON output
vbot status my-service      # Check specific service
```

### `vbot plugin <subcommand>`
Manage plugins.

```bash
vbot plugin list            # List installed plugins
vbot plugin install <name>   # Install a plugin
vbot plugin uninstall <name> # Uninstall a plugin
vbot plugin search <query>   # Search available plugins
```

### `vbot config <subcommand>`
Manage configuration.

```bash
vbot config list            # List all settings
vbot config get <key>        # Get a value
vbot config set <key> <val>  # Set a value
```

### `vbot info`
Display version and environment information.

```bash
vbot info                   # Basic info
vbot info --full            # Extended environment info
```

## Plugin System

Create your own plugins:

```js
// my-plugin/index.js
export default {
  name: 'my-plugin',
  version: '1.0.0',
  commands: [
    {
      name: 'hello',
      description: 'Say hello',
      action: async (args) => {
        console.log('Hello, VBot!');
      }
    }
  ],
  hooks: {
    beforeCommand: (cmd) => {
      console.log(`Running: ${cmd}`);
    },
    afterCommand: (cmd, result) => {
      console.log(`Done: ${cmd}`);
    }
  }
};
```

Plugins are stored in `~/.vbot/plugins/`. Install via:

```bash
vbot plugin install my-plugin
```

## Configuration

Config file: `~/.vbot/config.json`

```json
{
  "registry": "https://registry.npmjs.org",
  "pluginsDir": "~/.vbot/plugins",
  "theme": "dark",
  "verbose": false
}
```

## Architecture

```
vbot-cli/
├── bin/
│   └── vbot.js              # CLI entry point
├── src/
│   ├── core/
│   │   ├── logger.js        # Chalk-colored logging
│   │   ├── config-manager.js # Configuration management
│   │   └── plugin-manager.js # Plugin lifecycle
│   ├── commands/
│   │   ├── init.js          # Project scaffolding
│   │   ├── deploy.js        # Deployment pipeline
│   │   ├── status.js        # Status dashboard
│   │   ├── plugin.js        # Plugin management
│   │   ├── config.js        # Config management
│   │   └── info.js          # Version info
│   └── templates/
│       └── default/         # Project template
├── test/
│   └── cli.test.js          # Test suite
└── .github/workflows/
    └── ci.yml               # GitHub Actions CI
```

## Requirements

- Node.js >= 18.0.0

## License

MIT

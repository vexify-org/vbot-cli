#!/usr/bin/env node

'use strict';

const { initCommand } = require('../src/commands/init');
const { deployCommand } = require('../src/commands/deploy');
const { statusCommand } = require('../src/commands/status');
const { pluginCommand } = require('../src/commands/plugin');

module.exports = {
  initCommand,
  deployCommand,
  statusCommand,
  pluginCommand,
};

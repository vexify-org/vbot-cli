import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync, stat, existsSync } from 'node:fs';

describe('vbot-cli structure', () => {
  it('should have a valid package.json', () => {
    const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
    assert.ok(pkg.name === 'vbot-cli');
    assert.ok(pkg.version);
    assert.ok(pkg.bin?.vbot);
    assert.ok(pkg.engines?.node);
  });

  it('should have bin/vbot.js as executable entry', () => {
    const content = readFileSync('./bin/vbot.js', 'utf-8');
    assert.ok(content.includes('#!/usr/bin/env'));
  });

  it('should export all required commands', () => {
    const files = [
      './src/commands/init.js',
      './src/commands/deploy.js',
      './src/commands/status.js',
      './src/commands/plugin.js',
      './src/commands/config.js',
      './src/commands/info.js',
    ];
    for (const f of files) {
      const content = readFileSync(f, 'utf-8');
      assert.ok(content.includes('Command'), `Missing Command in ${f}`);
    }
  });

  it('should have core modules', () => {
    assert.ok(existsSync('./src/core/logger.js'));
    assert.ok(existsSync('./src/core/config-manager.js'));
    assert.ok(existsSync('./src/core/plugin-manager.js'));
  });

  it('should have template files', () => {
    assert.ok(existsSync('./src/templates/default/package.json'));
    assert.ok(existsSync('./src/templates/default/src/index.js'));
    assert.ok(existsSync('./src/templates/default/.gitignore'));
  });
});

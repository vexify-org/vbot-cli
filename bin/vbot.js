#!/usr/bin/env node
/**
 * VBot CLI - Command line entry point
 */
import { Command } from 'commander';
import initCmd from '../src/commands/init.js';
import deployCmd from '../src/commands/deploy.js';
import statusCmd from '../src/commands/status.js';

const program = new Command();

program
  .name('vbot')
  .description('VBot CLI - 命令行工具集')
  .version('1.0.0');

program
  .command('init')
  .description('初始化一个新项目')
  .argument('[name]', '项目名称')
  .option('-t, --template <type>', '项目模板', 'default')
  .action(initCmd);

program
  .command('deploy')
  .description('部署项目到目标环境')
  .argument('[target]', '部署目标', 'production')
  .option('-e, --env <env>', '环境变量文件', '.env')
  .option('--no-build', '跳过构建步骤')
  .action(deployCmd);

program
  .command('status')
  .description('检查服务状态')
  .argument('[service]', '服务名称（可选）')
  .option('-v, --verbose', '详细输出')
  .action(statusCmd);

program.parse();

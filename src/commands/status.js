/**
 * status command - 检查服务状态
 */
import { execSync } from 'node:child_process';

const SERVICES = [
  { name: 'API Server', port: 3000, checkPath: '/health' },
  { name: 'Web App', port: 3001, checkPath: '/' },
  { name: 'Worker', port: null, checkPath: null }
];

async function checkService(service, verbose) {
  const status = { name: service.name, port: service.port, status: 'unknown', latency: null };

  if (!service.checkPath) {
    status.status = '⚠️  no health endpoint';
    return status;
  }

  try {
    const start = Date.now();
    execSync(
      `curl -sf http://localhost:${service.port}${service.checkPath} > /dev/null 2>&1`,
      { timeout: 3000 }
    );
    status.status = '✅ healthy';
    status.latency = Date.now() - start;
  } catch {
    status.status = '❌ unreachable';
  }

  return status;
}

export default async function statusCmd(serviceName, options) {
  console.log('🔍 Checking service status...\n');

  const targets = serviceName
    ? SERVICES.filter(s => s.name.toLowerCase().includes(serviceName.toLowerCase()))
    : SERVICES;

  if (targets.length === 0) {
    console.log(`No service matching "${serviceName}"`);
    return;
  }

  const results = await Promise.all(
    targets.map(s => checkService(s, options.verbose))
  );

  console.log('┌──────────────────────┬──────────┬─────────────┐');
  console.log('│ Service              │ Port     │ Status      │');
  console.log('├──────────────────────┼──────────┼─────────────┤');
  for (const r of results) {
    const name = r.name.padEnd(20);
    const port = r.port ? String(r.port).padEnd(10) : 'N/A'.padEnd(10);
    const st = r.status.padEnd(11);
    console.log(`│ ${name} │ ${port} │ ${st} │`);
  }
  console.log('└──────────────────────┴──────────┴─────────────┘\n');
}

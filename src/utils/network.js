'use strict';

const { Logger } = require('./logger');

const DEFAULT_TIMEOUT = 15000;

async function request(url, options = {}) {
  const controller = new AbortController();
  const timeout = options.timeout || DEFAULT_TIMEOUT;
  const timer = setTimeout(() => controller.abort(), timeout);

  const defaults = {
    signal: controller.signal,
    headers: {
      'User-Agent': 'vbot-cli/1.0',
      'Accept': 'application/json, text/plain, */*',
      ...options.headers,
    },
  };

  const merged = { ...defaults, ...options };
  delete merged.timeout;

  try {
    const response = await fetch(url, merged);
    clearTimeout(timer);

    if (!response.ok && !options.skipErrors) {
      const body = await response.text().catch(() => '');
      const err = new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
      err.status = response.status;
      err.body = body;
      throw err;
    }

    const contentType = response.headers.get('content-type') || '';
    let data;

    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return { ok: response.ok, status: response.status, data, headers: response.headers };
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      err.message = `Request timeout after ${timeout}ms: ${url}`;
    }
    throw err;
  }
}

async function getJSON(url, options = {}) {
  const result = await request(url, { ...options, headers: { ...options.headers, Accept: 'application/json' } });
  return result.data;
}

async function postJSON(url, body, options = {}) {
  const result = await request(url, {
    ...options,
    method: 'POST',
    headers: {
      ...options.headers,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });
  return result.data;
}

async function checkConnectivity() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    await fetch('https://www.google.com/favicon.ico', {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timer);
    return true;
  } catch {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      await fetch('https://registry.npmjs.org', {
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timer);
      return true;
    } catch {
      return false;
    }
  }
}

async function checkHealth(url, logger) {
  const loggerInstance = logger || new Logger();
  try {
    const result = await request(url, { timeout: 10000 });
    const latency = result.headers.get('x-response-time') || 'N/A';
    loggerInstance.debug(`Health check OK: ${url} (${latency})`);
    return { healthy: true, status: result.status, latency };
  } catch (err) {
    loggerInstance.debug(`Health check FAILED: ${url} - ${err.message}`);
    return { healthy: false, error: err.message };
  }
}

async function downloadFile(url, destPath, onProgress) {
  const fs = require('fs');
  const path = require('path');

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: HTTP ${response.status}`);
  }

  const total = parseInt(response.headers.get('content-length') || '0', 10);
  const dir = path.dirname(destPath);
  const { mkdirSync, createWriteStream } = fs;

  mkdirSync(dir, { recursive: true });
  const stream = createWriteStream(destPath);
  let downloaded = 0;

  for await (const chunk of response.body) {
    stream.write(chunk);
    downloaded += chunk.length;
    if (onProgress && total > 0) {
      onProgress({ downloaded, total, percent: Math.round((downloaded / total) * 100) });
    }
  }

  stream.end();
  return destPath;
}

async function fetchTemplate(templateName, options = {}) {
  const { registry = 'https://registry.npmjs.org', logger } = options;
  const url = `${registry}/vbot-template-${templateName}/latest`;

  try {
    const data = await getJSON(url, { timeout: 10000 });
    return data;
  } catch (err) {
    if (logger) logger.debug(`Template fetch failed: ${err.message}`);
    return null;
  }
}

function buildQueryString(params) {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null);
  if (entries.length === 0) return '';
  return '?' + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
}

module.exports = {
  request,
  getJSON,
  postJSON,
  checkConnectivity,
  checkHealth,
  downloadFile,
  fetchTemplate,
  buildQueryString,
};

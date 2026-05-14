import { execFileSync } from 'node:child_process';

function parseScutilProxyOutput(output: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of output.split('\n')) {
    const match = line.match(/^\s*([A-Za-z0-9]+)\s*:\s*(.+)\s*$/);
    if (!match) continue;
    result[match[1]] = match[2];
  }
  return result;
}

export function applySystemProxyEnvironment() {
  if (process.env.HTTP_PROXY || process.env.HTTPS_PROXY || process.env.ALL_PROXY) {
    return;
  }

  try {
    const output = execFileSync('scutil', ['--proxy'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const proxyConfig = parseScutilProxyOutput(output);

    const httpEnabled = proxyConfig.HTTPEnable === '1';
    const httpsEnabled = proxyConfig.HTTPSEnable === '1';
    const socksEnabled = proxyConfig.SOCKSEnable === '1';

    if (httpEnabled && proxyConfig.HTTPProxy && proxyConfig.HTTPPort) {
      process.env.HTTP_PROXY = `http://${proxyConfig.HTTPProxy}:${proxyConfig.HTTPPort}`;
      process.env.GOOGLE_PLAY_HTTP_PROXY = process.env.GOOGLE_PLAY_HTTP_PROXY || process.env.HTTP_PROXY;
    }
    if (httpsEnabled && proxyConfig.HTTPSProxy && proxyConfig.HTTPSPort) {
      process.env.HTTPS_PROXY = `http://${proxyConfig.HTTPSProxy}:${proxyConfig.HTTPSPort}`;
      process.env.GOOGLE_PLAY_HTTPS_PROXY = process.env.GOOGLE_PLAY_HTTPS_PROXY || process.env.HTTPS_PROXY;
    }
    if (socksEnabled && proxyConfig.SOCKSProxy && proxyConfig.SOCKSPort) {
      process.env.ALL_PROXY = `socks5://${proxyConfig.SOCKSProxy}:${proxyConfig.SOCKSPort}`;
    }

    if (!process.env.NO_PROXY) {
      process.env.NO_PROXY = '127.0.0.1,localhost';
    }
  } catch {
    // If system proxy lookup fails, leave env unchanged and let connectivity probe report the issue.
  }
}

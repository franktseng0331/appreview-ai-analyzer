import hpagent from 'hpagent';

const { HttpProxyAgent, HttpsProxyAgent } = hpagent as unknown as {
  HttpProxyAgent: new (input: { proxy: string }) => unknown;
  HttpsProxyAgent: new (input: { proxy: string }) => unknown;
};

function currentGooglePlayProxyConfig() {
  return {
    httpProxy: process.env.GOOGLE_PLAY_HTTP_PROXY || process.env.HTTP_PROXY || '',
    httpsProxy: process.env.GOOGLE_PLAY_HTTPS_PROXY || process.env.HTTPS_PROXY || '',
  };
}

export function buildGooglePlayRequestOptions() {
  const options: Record<string, unknown> = {};
  const { httpProxy, httpsProxy } = currentGooglePlayProxyConfig();

  if (httpProxy) {
    options.agent = {
      ...(options.agent as Record<string, unknown> | undefined),
      http: new HttpProxyAgent({
        proxy: httpProxy,
      }),
    };
  }

  if (httpsProxy) {
    options.agent = {
      ...(options.agent as Record<string, unknown> | undefined),
      https: new HttpsProxyAgent({
        proxy: httpsProxy,
      }),
    };
  }

  return Object.keys(options).length ? options : undefined;
}

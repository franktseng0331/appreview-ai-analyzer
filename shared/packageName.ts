export function normalizePackageNameInput(raw: string): string {
  let value = raw.trim();
  if (!value) return '';

  const directIdMatch = value.match(/[?&]id=([^&#\s]+)/i);
  if (directIdMatch?.[1]) {
    value = decodeURIComponent(directIdMatch[1]);
  } else if (/^https?:\/\//i.test(value) || value.includes('play.google.com/')) {
    try {
      const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
      const appId = url.searchParams.get('id');
      if (appId) {
        value = appId;
      }
    } catch {
      // Fall through to token-based cleanup for malformed pasted URLs.
    }
  }

  value = value.replace(/^id=/i, '');
  value = value.replace(/[?#&].*$/, '');
  value = value.replace(/\/+$/, '');

  const packageMatch = value.match(/[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)+/);
  return packageMatch?.[0] || value;
}

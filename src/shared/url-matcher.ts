/**
 * WebExtension match pattern → URL matching
 * Supports the standard <scheme>://<host>/<path> patterns.
 * Reference: https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns
 */

export function matchesPattern(url: string, pattern: string): boolean {
  if (pattern === '<all_urls>') return true;

  try {
    const parsed = new URL(url);
    const regex = patternToRegex(pattern);
    return regex.test(url) || regex.test(`${parsed.protocol}//${parsed.host}${parsed.pathname}`);
  } catch {
    return false;
  }
}

export function matchesAnyPattern(url: string, patterns: string[]): boolean {
  return patterns.some(p => matchesPattern(url, p));
}

export function isExcluded(url: string, excludePatterns: string[]): boolean {
  return excludePatterns.length > 0 && matchesAnyPattern(url, excludePatterns);
}

export function urlMatchesScript(
  url: string,
  matchPatterns: string[],
  excludePatterns: string[]
): boolean {
  if (matchPatterns.length === 0) return false;
  if (!matchesAnyPattern(url, matchPatterns)) return false;
  if (isExcluded(url, excludePatterns)) return false;
  return true;
}

function patternToRegex(pattern: string): RegExp {
  // Handle special scheme patterns
  const schemeMatch = pattern.match(/^([^:]+):\/\//);
  if (!schemeMatch) return /^$/; // invalid pattern

  const scheme = schemeMatch[1];
  const rest = pattern.slice(scheme.length + 3);

  let schemeRegex: string;
  if (scheme === '*') {
    schemeRegex = 'https?';
  } else {
    schemeRegex = escapeRegExp(scheme);
  }

  const slashIndex = rest.indexOf('/');
  const host = slashIndex === -1 ? rest : rest.slice(0, slashIndex);
  const path = slashIndex === -1 ? '' : rest.slice(slashIndex);

  const hostRegex = hostPatternToRegex(host);
  const pathRegex = globToRegex(path || '/');

  return new RegExp(`^${schemeRegex}://${hostRegex}${pathRegex}$`);
}

function hostPatternToRegex(host: string): string {
  if (host === '*') return '[^/]+';

  if (host.startsWith('*.')) {
    const base = escapeRegExp(host.slice(2));
    return `([^/]+\\.)?${base}`;
  }

  return escapeRegExp(host);
}

function globToRegex(glob: string): string {
  return glob
    .split('*')
    .map(escapeRegExp)
    .join('.*');
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Validate a match pattern string.
 * Returns null if valid, or an error message if invalid.
 */
export function validateMatchPattern(pattern: string): string | null {
  if (pattern === '<all_urls>') return null;

  const validSchemes = ['http', 'https', 'file', 'ftp', '*'];
  const match = pattern.match(/^([^:]+):\/\/([^/]*)(.*)$/);

  if (!match) return 'Invalid pattern format. Expected: <scheme>://<host>/<path>';

  const [, scheme, host, path] = match;

  if (!validSchemes.includes(scheme)) {
    return `Invalid scheme "${scheme}". Use: ${validSchemes.join(', ')}`;
  }

  if (!host && scheme !== 'file') {
    return 'Host is required';
  }

  if (host && !host.match(/^(\*|(\*\.)?[a-zA-Z0-9][-a-zA-Z0-9.]*[a-zA-Z0-9])$/)) {
    if (host !== '*') {
      return `Invalid host "${host}". Use "*" or "*.hostname" or "hostname"`;
    }
  }

  if (path && !path.startsWith('/')) {
    return 'Path must start with "/"';
  }

  return null;
}

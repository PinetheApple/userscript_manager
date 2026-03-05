import type { TGrantType, TRunAt } from './types';

export interface IParsedMetadata {
  name: string;
  description: string;
  version: string;
  author: string;
  matchPatterns: string[];
  excludePatterns: string[];
  grants: TGrantType[];
  runAt: TRunAt;
}

const VALID_GRANTS: TGrantType[] = [
  'GM_getValue', 'GM_setValue', 'GM_deleteValue', 'GM_listValues',
  'GM_xmlhttpRequest', 'GM_addStyle', 'GM_log', 'GM_info',
];

const RUN_AT_MAP: Record<string, TRunAt> = {
  'document-start': 'document-start',
  'document-end': 'document-end',
  'document-idle': 'document-idle',
  'document_start': 'document-start',
  'document_end': 'document-end',
  'document_idle': 'document-idle',
};

export function parseMetadata(code: string): IParsedMetadata {
  const block = extractMetadataBlock(code);

  const defaults: IParsedMetadata = {
    name: 'Unnamed Script',
    description: '',
    version: '1.0.0',
    author: '',
    matchPatterns: [],
    excludePatterns: [],
    grants: [],
    runAt: 'document-idle',
  };

  if (!block) return defaults;

  const lines = block.split('\n');
  const result = { ...defaults };

  for (const line of lines) {
    const match = line.match(/^\s*\/\/\s*@(\S+)\s*(.*?)\s*$/);
    if (!match) continue;

    const [, key, value] = match;

    switch (key) {
      case 'name':
        result.name = value || defaults.name;
        break;
      case 'description':
        result.description = value;
        break;
      case 'version':
        result.version = value || defaults.version;
        break;
      case 'author':
        result.author = value;
        break;
      case 'match':
        if (value) result.matchPatterns.push(value);
        break;
      case 'exclude':
        if (value) result.excludePatterns.push(value);
        break;
      case 'grant':
        if (VALID_GRANTS.includes(value as TGrantType)) {
          result.grants.push(value as TGrantType);
        }
        break;
      case 'run-at':
      case 'runat': {
        const mapped = RUN_AT_MAP[value];
        if (mapped) result.runAt = mapped;
        break;
      }
    }
  }

  return result;
}

/** Returns everything after the ==/UserScript== closing tag, trimmed. */
export function extractBodyCode(code: string): string {
  const end = code.indexOf('// ==/UserScript==');
  if (end === -1) return code.trim();
  return code.slice(end + '// ==/UserScript=='.length).trimStart();
}

export function extractMetadataBlock(code: string): string | null {
  const start = code.indexOf('// ==UserScript==');
  const end = code.indexOf('// ==/UserScript==');

  if (start === -1 || end === -1) return null;

  return code.slice(start, end + '// ==/UserScript=='.length);
}

export function serializeMetadata(meta: IParsedMetadata): string {
  const lines = ['// ==UserScript=='];

  lines.push(`// @name         ${meta.name}`);
  if (meta.description) lines.push(`// @description  ${meta.description}`);
  lines.push(`// @version      ${meta.version}`);
  if (meta.author) lines.push(`// @author       ${meta.author}`);
  for (const pattern of meta.matchPatterns) {
    lines.push(`// @match        ${pattern}`);
  }
  for (const pattern of meta.excludePatterns) {
    lines.push(`// @exclude      ${pattern}`);
  }
  for (const grant of meta.grants) {
    lines.push(`// @grant        ${grant}`);
  }
  if (meta.runAt !== 'document-idle') {
    lines.push(`// @run-at       ${meta.runAt}`);
  }

  lines.push('// ==/UserScript==');

  return lines.join('\n');
}

import { parse } from 'acorn';
import { linter, lintGutter } from '@codemirror/lint';
import { completeFromList } from '@codemirror/autocomplete';
import type { Diagnostic } from '@codemirror/lint';
import type { CompletionContext } from '@codemirror/autocomplete';

const GM_COMPLETIONS = [
  { label: 'GM_getValue',        type: 'function' as const, detail: '(key, defaultValue?) → Promise', info: 'Read a persisted value by key.' },
  { label: 'GM_setValue',        type: 'function' as const, detail: '(key, value) → Promise',         info: 'Persist a value under a key.' },
  { label: 'GM_deleteValue',     type: 'function' as const, detail: '(key) → Promise',                info: 'Delete a persisted value by key.' },
  { label: 'GM_listValues',      type: 'function' as const, detail: '() → Promise<string[]>',         info: 'List all keys stored for this script.' },
  { label: 'GM_xmlhttpRequest',  type: 'function' as const, detail: '(details) → Promise',            info: 'Make a cross-origin HTTP request.' },
  { label: 'GM_addStyle',        type: 'function' as const, detail: '(css) → void',                   info: 'Inject a CSS string into the page.' },
  { label: 'GM_info',            type: 'variable' as const, detail: 'object',                         info: 'Information about this script and the script handler.' },
];

function gmCompletions(context: CompletionContext) {
  const word = context.matchBefore(/GM_\w*/);
  if (!word || (word.from === word.to && !context.explicit)) return null;
  return completeFromList(GM_COMPLETIONS)(context);
}

export const jsLinter = linter((view): Diagnostic[] => {
  const code = view.state.doc.toString();
  if (!code.trim()) return [];

  try {
    parse(code, { ecmaVersion: 'latest', sourceType: 'script' });
    return [];
  } catch (e) {
    if (!(e instanceof SyntaxError)) return [];
    const err = e as SyntaxError & { pos?: number; loc?: { line: number; column: number } };
    const pos = err.pos ?? 0;
    return [{
      from: pos,
      to: Math.min(pos + 1, view.state.doc.length),
      severity: 'error',
      message: err.message.replace(/ \(\d+:\d+\)$/, ''),
    }];
  }
});

export const gmCompletion = gmCompletions;
export { lintGutter };

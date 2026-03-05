import * as esbuild from 'esbuild';
import { copyFileSync, mkdirSync, cpSync } from 'fs';
import { spawn } from 'child_process';

// ── Constants ────────────────────────────────────────────────────────────────

const VALID_TARGETS = ['chrome', 'firefox', 'safari'] as const;
type TBuildTarget = typeof VALID_TARGETS[number];

const DEFAULT_TARGET: TBuildTarget = 'chrome';
const ESBUILD_BROWSER_TARGET = 'chrome120';

const CSS_INPUT  = 'src/styles/main.css';
const TAILWIND_BIN = 'node_modules/.bin/tailwindcss';

const ENTRIES = [
  { in: 'src/background/index.ts',   out: 'background.js' },
  { in: 'src/content/index.ts',      out: 'content.js'    },
  { in: 'src/pages/shell/index.tsx', out: 'shell.js'      },
  { in: 'src/pages/manager/index.tsx', out: 'manager.js'  },
  { in: 'src/pages/editor/index.tsx', out: 'editor.js'    },
] as const;

const HTML_FILES = [
  { src: 'src/pages/shell/index.html',   dest: 'shell.html'   },
  { src: 'src/pages/manager/index.html', dest: 'manager.html' },
  { src: 'src/pages/editor/index.html',  dest: 'editor.html'  },
] as const;

// ── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const watch = args.includes('--watch');
const prod  = args.includes('--prod');

function resolveTarget(): TBuildTarget {
  const eqArg = args.find((a: string) => a.startsWith('--target='))?.split('=')[1];
  if (eqArg) return VALID_TARGETS.includes(eqArg as TBuildTarget) ? eqArg as TBuildTarget : DEFAULT_TARGET;

  const idx = args.indexOf('--target');
  const next = idx !== -1 ? args[idx + 1] : undefined;
  if (next && !next.startsWith('--') && VALID_TARGETS.includes(next as TBuildTarget)) {
    return next as TBuildTarget;
  }
  return DEFAULT_TARGET;
}

const target = resolveTarget();
const outDir = `dist/${target}`;

// ── Shared esbuild config ────────────────────────────────────────────────────

const sharedConfig: esbuild.BuildOptions = {
  bundle:    true,
  format:    'iife',
  platform:  'browser',
  jsx:       'automatic',
  sourcemap: !prod,
  minify:    prod,
  target:    [ESBUILD_BROWSER_TARGET],
  define: {
    'process.env.NODE_ENV': prod ? '"production"' : '"development"',
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function copyStaticFiles(): void {
  mkdirSync(outDir, { recursive: true });
  mkdirSync(`${outDir}/icons`, { recursive: true });

  for (const { src, dest } of HTML_FILES) {
    copyFileSync(src, `${outDir}/${dest}`);
  }

  copyFileSync(`manifests/manifest.${target}.json`, `${outDir}/manifest.json`);

  try {
    cpSync('public/icons', `${outDir}/icons`, { recursive: true });
  } catch {
    // Icons not yet generated — run `bun run icons` first
  }
}

function buildCSS(): Promise<void> {
  return new Promise((resolve, reject) => {
    const twArgs = [
      TAILWIND_BIN,
      '-i', CSS_INPUT,
      '-o', `${outDir}/main.css`,
      ...(watch ? ['--watch'] : []),
      ...(prod   ? ['--minify'] : []),
    ];

    const tw = spawn(process.execPath, twArgs, { stdio: 'inherit' });

    if (watch) {
      resolve(); // tailwind runs in background
      return;
    }

    tw.on('close', (code: number | null) => {
      if (code === 0) resolve();
      else reject(new Error(`Tailwind exited with code ${code}`));
    });
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`Building ScriptFlow for ${target} (${prod ? 'production' : 'development'})...`);

  copyStaticFiles();

  if (watch) {
    const contexts = await Promise.all(
      ENTRIES.map(entry =>
        esbuild.context({
          ...sharedConfig,
          entryPoints: [entry.in],
          outfile: `${outDir}/${entry.out}`,
        })
      )
    );
    await Promise.all(contexts.map(ctx => ctx.watch()));
    console.log('esbuild watching...');
    await buildCSS();
    console.log('Tailwind watching... Build ready.');
  } else {
    await Promise.all(
      ENTRIES.map(entry =>
        esbuild.build({
          ...sharedConfig,
          entryPoints: [entry.in],
          outfile: `${outDir}/${entry.out}`,
        })
      )
    );
    await buildCSS();
    console.log(`Build complete → ${outDir}/`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

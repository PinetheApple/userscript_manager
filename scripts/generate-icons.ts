import { mkdirSync, writeFileSync } from 'fs';

const SIZES = [16, 48, 128] as const;

/**
 * ScriptFlow icon — a lightning bolt on a dark background.
 * Generates SVG → PNG via sharp.
 */
function generateSVG(size: number): string {
  const padding = Math.floor(size * 0.1);
  const boltColor = '#818cf8'; // indigo-400 (accent)
  const bgColor = '#18181b';   // zinc-900

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.floor(size * 0.22)}" fill="${bgColor}"/>
  <path
    d="M ${size * 0.6} ${padding} L ${size * 0.3} ${size * 0.52} L ${size * 0.52} ${size * 0.52} L ${size * 0.4} ${size - padding} L ${size * 0.7} ${size * 0.48} L ${size * 0.48} ${size * 0.48} Z"
    fill="${boltColor}"
  />
</svg>`;
}

async function main() {
  const outDir = 'public/icons';
  mkdirSync(outDir, { recursive: true });

  // Dynamically import sharp (native dep, may require allow-scripts)
  let sharp: (typeof import('sharp'))['default'];
  try {
    sharp = (await import('sharp')).default;
  } catch {
    console.error('sharp not available. Run: bun pm allow-scripts && bun install');
    process.exit(1);
  }

  for (const size of SIZES) {
    const svg = generateSVG(size);
    const svgBuffer = Buffer.from(svg);
    const outPath = `${outDir}/icon${size}.png`;

    await sharp(svgBuffer).png().toFile(outPath);
    console.log(`✓ ${outPath} (${size}×${size})`);
  }

  console.log('Icons generated successfully.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});

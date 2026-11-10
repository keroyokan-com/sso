'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const ROOT = path.join(__dirname, '..');
const ICON_DIR = path.join(ROOT, 'public', 'app-icons');
const REPORT_DIR = path.join(ROOT, 'benchmarks');
const REPORT_PATH = path.join(REPORT_DIR, 'images-after.json');
const SIZES = [48, 96];
const FORMATS = [
  {
    ext: 'webp',
    options: { quality: 80, effort: 4, smartSubsample: true },
  },
  {
    ext: 'avif',
    options: { quality: 55, effort: 4 },
  },
];

function listIcons() {
  if (!fs.existsSync(ICON_DIR)) {
    throw new Error(`Icon directory not found: ${ICON_DIR}`);
  }

  return fs
    .readdirSync(ICON_DIR, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.png'))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, 'en'));
}

function formatBytes(bytes) {
  return `${bytes.toLocaleString('en-US')} B (${(bytes / 1024).toFixed(1)} KiB)`;
}

async function main() {
  const icons = listIcons();
  const variants = {};

  for (const size of SIZES) {
    variants[size] = {};
    for (const format of FORMATS) {
      variants[size][format.ext] = { files: 0, bytes: 0 };
    }
  }

  const files = [];
  let originalBytes = 0;
  let totalVariantBytes = 0;

  for (const file of icons) {
    const sourcePath = path.join(ICON_DIR, file);
    const base = path.parse(file).name;
    const original = fs.statSync(sourcePath).size;
    originalBytes += original;

    const entry = { file, originalBytes: original };

    for (const size of SIZES) {
      const outDir = path.join(ICON_DIR, String(size));
      fs.mkdirSync(outDir, { recursive: true });

      for (const format of FORMATS) {
        const outPath = path.join(outDir, `${base}.${format.ext}`);
        await sharp(sourcePath)
          .resize(size, size, {
            fit: 'contain',
            withoutEnlargement: true,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          })
          .toFormat(format.ext, format.options)
          .toFile(outPath);

        const bytes = fs.statSync(outPath).size;
        variants[size][format.ext].files += 1;
        variants[size][format.ext].bytes += bytes;
        totalVariantBytes += bytes;
        entry[`${format.ext}${size}`] = bytes;
      }
    }

    files.push(entry);
  }

  const reductionPercent =
    originalBytes > 0 ? Number((((originalBytes - totalVariantBytes) / originalBytes) * 100).toFixed(2)) : 0;

  const report = {
    source: 'public/app-icons/*.png',
    iconCount: icons.length,
    originalBytes,
    variants,
    totalVariantBytes,
    reductionPercent,
    files,
  };

  fs.mkdirSync(REPORT_DIR, { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n');

  console.log('');
  console.log(`Icons: ${icons.length}`);
  console.log(`Original PNGs: ${formatBytes(originalBytes)}`);
  for (const size of SIZES) {
    for (const format of FORMATS) {
      const stats = variants[size][format.ext];
      console.log(`  ${size}px ${format.ext}: ${stats.files} files, ${formatBytes(stats.bytes)}`);
    }
  }
  console.log(`All variants: ${formatBytes(totalVariantBytes)}`);
  console.log(`Reduction vs originals: ${reductionPercent.toFixed(2)}%`);
  console.log(`Report: ${path.relative(ROOT, REPORT_PATH)}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const PUB = path.join(__dirname, '..', '..', 'public');

function walk(dir, filter) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full, filter));
    else if (filter(full)) out.push(full);
  }
  return out;
}

function info(file) {
  const buf = fs.readFileSync(file);
  return {
    file: path.relative(PUB, file).replaceAll('\\', '/'),
    bytes: buf.length,
    gzipBytes: zlib.gzipSync(buf, { level: 9 }).length,
    brotliBytes: zlib.brotliCompressSync(buf).length,
  };
}

const appJs = info(path.join(PUB, 'app.js'));
const css = info(path.join(PUB, 'styles.css'));
const fonts = walk(path.join(PUB, 'fonts'), () => true).map(info);
const icons = walk(path.join(PUB, 'app-icons'), (f) => f.endsWith('.png')).map(info);
const allPublic = walk(PUB, () => true).map(info);

const sum = (list) => list.reduce((n, x) => n + x.bytes, 0);
const sumGzip = (list) => list.reduce((n, x) => n + x.gzipBytes, 0);
const bySize = (a, b) => b.bytes - a.bytes;

const core = [appJs, css, ...fonts, ...icons];
const payload = {
  measuredAt: new Date().toISOString(),
  note: 'Raw on-disk bytes. The local server sends files uncompressed; gzip/brotli columns are hypothetical transfer sizes.',
  serverUncompressed: true,
  groups: {
    appJs,
    stylesCss: css,
    fonts: { count: fonts.length, bytes: sum(fonts), gzipBytes: sumGzip(fonts), files: fonts.sort(bySize) },
    appIcons: {
      count: icons.length,
      bytes: sum(icons),
      gzipBytes: sumGzip(icons),
      files: icons.sort(bySize),
    },
    coreTotal: { count: core.length, bytes: sum(core), gzipBytes: sumGzip(core) },
    allPublic: { count: allPublic.length, bytes: sum(allPublic), gzipBytes: sumGzip(allPublic) },
  },
};

fs.writeFileSync(
  path.join(__dirname, '..', 'baseline', 'payload.json'),
  JSON.stringify(payload, null, 2)
);

const row = (x) => `${x.file}\t${x.bytes}\t${x.gzipBytes}`;
console.log('file\tbytes\tgzip');
console.log(row(appJs));
console.log(row(css));
for (const f of fonts) console.log(row(f));
console.log(`fonts subtotal\t${sum(fonts)}\t${sumGzip(fonts)}`);
console.log(`app-icons subtotal (${icons.length} files)\t${sum(icons)}\t${sumGzip(icons)}`);
console.log('largest 10 app icons:');
for (const f of icons.slice(0, 10)) console.log(row(f));
console.log(`core total (${core.length} files)\t${sum(core)}\t${sumGzip(core)}`);
console.log(`all public (${allPublic.length} files)\t${sum(allPublic)}\t${sumGzip(allPublic)}`);

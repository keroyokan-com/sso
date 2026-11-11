import fs from 'node:fs';

const tag = process.argv[2] || '';
const version = tag.replace(/^v/, '');

if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error(`invalid semver tag: ${tag || '(missing)'}`);
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (pkg.version !== version) {
  console.error(`package.json is ${pkg.version}, tag is ${version}`);
  process.exit(1);
}

const lines = fs.readFileSync('CHANGELOG.md', 'utf8').split(/\r?\n/);
const start = lines.findIndex((line) => line.startsWith(`## ${version} -`));
if (start === -1) {
  console.error(`no changelog section for ${version}`);
  process.exit(1);
}

const body = [];
for (let i = start + 1; i < lines.length; i += 1) {
  if (/^##\s/.test(lines[i])) break;
  body.push(lines[i]);
}

const notes = body.join('\n').trim();
if (!notes) {
  console.error(`changelog section for ${version} is empty`);
  process.exit(1);
}

process.stdout.write(`${notes}\n`);

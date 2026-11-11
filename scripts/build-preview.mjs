import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const output = new URL('dist-preview/', root);
const files = [
  ['preview/index.html', 'index.html'],
  ['engine/warehouse.js', 'engine/warehouse.js'],
  ['engine/warehouse.css', 'engine/warehouse.css'],
];

const headers = `/*
  Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'none'; img-src 'none'; media-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  X-Robots-Tag: noindex, nofollow
  Cache-Control: no-store
`;

const assets = await Promise.all(files.map(async ([source, destination]) => [
  destination, await readFile(new URL(source, root)),
]));
const hash = createHash('sha256');
hash.update(headers);
for (const [destination, content] of assets) {
  hash.update(destination);
  hash.update(content);
}

const manifest = {
  environment: 'staging',
  mode: 'isolated-fixture',
  sourceCommit: process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA || 'local',
  baselineBlob: '72d29fc91e2c58be71a9a4df0596d1ec319545ea',
  buildId: hash.digest('hex'),
};

await rm(output, { recursive: true, force: true });
await mkdir(new URL('engine/', output), { recursive: true });
for (const [destination, content] of assets) {
  await writeFile(new URL(destination, output), content);
}
await writeFile(new URL('_headers', output), headers);
await writeFile(new URL('version.json', output), JSON.stringify(manifest, null, 2) + '\n');
console.log('Built Sentence Warehouse staging preview:', manifest.buildId);

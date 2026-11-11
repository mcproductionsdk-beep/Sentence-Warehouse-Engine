import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const output = new URL('dist-preview/', root);
const files = [
  ['engine/lifecycle.js', 'engine/lifecycle.js'],
  ['preview/index.html', 'index.html'],
  ['engine/warehouse.js', 'engine/warehouse.js'],
  ['engine/warehouse.css', 'engine/warehouse.css'],
];

const headers = `/*
  Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'none'; img-src 'none'; media-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors https://bt-vocabulary-platform-staging.pages.dev https://*.bt-vocabulary-platform-staging.pages.dev
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin
  X-Robots-Tag: noindex, nofollow
  Cache-Control: no-store
`;

// Versioned adapter utility copied from Educational-Games at 326eae1c636b15a7e79690b0f150f3680003b3ba.
const lifecycleDigest = createHash('sha256').update(await readFile(new URL('engine/lifecycle.js',root))).digest('hex');
if(lifecycleDigest !== '39be3509960c6c5132d8074a4fe65ac663175e546cffab2f7562ba620cc1b777')throw Error('Unreviewed Sentence lifecycle utility');

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
  mode: 'sentence-session-v1',
  sourceCommit: process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA || 'local',
  baselineBlob: '72d29fc91e2c58be71a9a4df0596d1ec319545ea',
  buildId: hash.digest('hex'),
};

await rm(output, { recursive: true, force: true });
await mkdir(new URL('engine/', output), { recursive: true });
for (const [destination, content] of assets) {
  await writeFile(new URL(destination, output), content);
}
await writeFile(new URL('engine/build-id.mjs',output),'export default '+JSON.stringify(manifest.buildId)+';\n');
await writeFile(new URL('_headers', output), headers);
await writeFile(new URL('version.json', output), JSON.stringify(manifest, null, 2) + '\n');
console.log('Built Sentence Warehouse staging preview:', manifest.buildId);

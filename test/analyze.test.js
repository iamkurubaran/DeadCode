import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { findDeadCode } from '../src/index.js';

async function makeFixture(files) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'deadcode-'));
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(dir, rel);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, content, 'utf8');
  }
  return dir;
}

test('detects an export used in no other file', async () => {
  const dir = await makeFixture({
    'package.json': JSON.stringify({ name: 'fix', main: 'index.js' }),
    'index.js': `import { used } from './lib.js';\nexport const publicApi = used;`,
    'lib.js': `export const used = 1;\nexport const deadOne = 2;\nexport function deadTwo() {}`,
  });

  const result = await findDeadCode({ cwd: dir });
  const deadNames = result.unused.map((u) => u.name).sort();

  assert.deepEqual(deadNames, ['deadOne', 'deadTwo']);
  await fs.rm(dir, { recursive: true, force: true });
});

test('entry-point (main) exports are never dead', async () => {
  const dir = await makeFixture({
    'package.json': JSON.stringify({ name: 'fix', main: 'index.js' }),
    'index.js': `export const publicApi = 1;`,
  });

  const result = await findDeadCode({ cwd: dir });
  assert.equal(result.unused.length, 0);
  await fs.rm(dir, { recursive: true, force: true });
});

test('cross-package usage in a monorepo is respected', async () => {
  const dir = await makeFixture({
    'package.json': JSON.stringify({ name: 'root', private: true }),
    // Package a's public API is index.js; helpers.js is internal (not an entry).
    'packages/a/package.json': JSON.stringify({ name: 'a', main: 'src/index.js' }),
    'packages/a/src/index.js': `export { shared } from './helpers.js';`,
    'packages/a/src/helpers.js': `export const shared = 42;\nexport const lonely = 0;`,
    'packages/b/package.json': JSON.stringify({ name: 'b', main: 'src/index.js' }),
    'packages/b/src/index.js': `import { shared } from '../../a/src/index.js';\nexport const usesShared = shared + 1;`,
  });

  const result = await findDeadCode({ cwd: dir });
  const deadNames = result.unused.map((u) => u.name);

  // "shared" is re-exported by a's public index and used by b -> not dead.
  // "lonely" lives in an internal helper and is imported nowhere -> dead.
  assert.ok(deadNames.includes('lonely'), 'lonely should be flagged dead');
  assert.ok(!deadNames.includes('shared'), 'shared is used cross-package');
  await fs.rm(dir, { recursive: true, force: true });
});

test('barrel re-export star does not cause false positives', async () => {
  const dir = await makeFixture({
    'package.json': JSON.stringify({ name: 'fix', main: 'index.js' }),
    'index.js': `import { deep } from './barrel.js';\nexport const api = deep;`,
    'barrel.js': `export * from './impl.js';`,
    'impl.js': `export const deep = 5;`,
  });

  const result = await findDeadCode({ cwd: dir });
  const deadNames = result.unused.map((u) => u.name);
  assert.ok(!deadNames.includes('deep'), 'deep is used through the barrel');
  await fs.rm(dir, { recursive: true, force: true });
});

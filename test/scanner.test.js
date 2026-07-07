import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stripNonCode } from '../src/scanners/strip.js';
import { extractExports } from '../src/scanners/exports.js';
import { extractImports } from '../src/scanners/imports.js';

test('stripNonCode removes string contents but keeps length', () => {
  const src = `const x = "export const fake = 1"; const y = 2;`;
  const stripped = stripNonCode(src, true); // defuse strings
  assert.equal(stripped.length, src.length);
  assert.ok(!/export/.test(stripped), 'keyword inside string should be gone');
  assert.ok(/const y = 2/.test(stripped), 'real code preserved');
});

test('stripNonCode removes line and block comments', () => {
  const src = `// export const a = 1\n/* export const b */\nexport const c = 3;`;
  const stripped = stripNonCode(src);
  const exps = extractExports(stripped).map((e) => e.name);
  assert.deepEqual(exps, ['c']);
});

test('extractExports handles ESM named/default/function/class', () => {
  const src = `
    export default function App() {}
    export const a = 1, b = 2;
    export function foo() {}
    export class Bar {}
    export { a as renamed };
  `;
  const names = extractExports(stripNonCode(src)).map((e) => e.name).sort();
  assert.ok(names.includes('default'));
  assert.ok(names.includes('a'));
  assert.ok(names.includes('b'));
  assert.ok(names.includes('foo'));
  assert.ok(names.includes('Bar'));
  assert.ok(names.includes('renamed'));
});

test('extractExports handles TypeScript types and CommonJS', () => {
  const src = `
    export interface Props {}
    export type ID = string;
    export enum Color { Red }
    module.exports.helper = function () {};
    exports.other = 1;
  `;
  const names = extractExports(stripNonCode(src)).map((e) => e.name);
  assert.ok(names.includes('Props'));
  assert.ok(names.includes('ID'));
  assert.ok(names.includes('Color'));
  assert.ok(names.includes('helper'));
  assert.ok(names.includes('other'));
});

test('extractImports resolves named, default, namespace, dynamic', () => {
  const src = `
    import Foo, { a, b as c } from './x';
    import * as NS from './y';
    const mod = await import('./z');
    const { one, two } = require('./cjs');
    import './side-effect';
  `;
  const imports = extractImports(stripNonCode(src));
  const bySpec = Object.fromEntries(imports.map((i) => [i.specifier, i]));

  assert.deepEqual(bySpec['./x'].names.sort(), ['a', 'b', 'default'].sort());
  assert.equal(bySpec['./y'].namespace, true);
  assert.equal(bySpec['./z'].namespace, true);
  assert.deepEqual(bySpec['./cjs'].names.sort(), ['one', 'two']);
  assert.equal(bySpec['./side-effect'].sideEffectOnly, true);
});

test('division is not mistaken for a regex', () => {
  const src = `const ratio = totalExports / usedExports; export const r = ratio;`;
  const stripped = stripNonCode(src);
  assert.ok(/export const r/.test(stripped));
  assert.equal(extractExports(stripped)[0].name, 'r');
});

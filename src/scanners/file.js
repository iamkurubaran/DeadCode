import fs from 'node:fs/promises';
import { stripNonCode } from './strip.js';
import { extractExports } from './exports.js';
import { extractImports } from './imports.js';

/**
 * Scan a single file into a normalized record.
 *
 * @param {string} absPath
 * @returns {Promise<{
 *   path: string,
 *   exports: Array<{name:string,line:number,kind:string}>,
 *   imports: Array<{specifier:string,names:string[],namespace:boolean,sideEffectOnly:boolean}>,
 *   identifiers: Set<string>
 * }>}
 */
export async function scanFile(absPath) {
  const raw = await fs.readFile(absPath, 'utf8');
  // For exports we defuse string contents (keywords in strings must not match).
  // For imports we keep specifiers intact (they live inside strings).
  const codeForExports = stripNonCode(raw, true);
  const codeForImports = stripNonCode(raw, false);

  const exportsFound = extractExports(codeForExports);
  const importsFound = extractImports(codeForImports);
  const identifiers = collectIdentifiers(codeForExports);

  return {
    path: absPath,
    exports: exportsFound,
    imports: importsFound,
    identifiers,
  };
}

/**
 * Collect the set of identifier tokens used anywhere in the file. Used to
 * detect re-exported names that are consumed via `export * from` chains and
 * to support namespace-import member access heuristics.
 */
function collectIdentifiers(code) {
  const set = new Set();
  for (const m of code.matchAll(/[A-Za-z_$][\w$]*/g)) {
    set.add(m[0]);
  }
  return set;
}

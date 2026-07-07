import fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import { resolveImport } from '../utils/paths.js';

/**
 * Determine the set of entry-point files whose exports form the public API
 * and should therefore never be flagged as dead.
 *
 * Sources:
 *   - package.json "main", "module", "bin", "exports"
 *   - test files (they consume exports but are leaves; we treat their imports
 *     as usage automatically, so no special handling needed here)
 *   - user-supplied entry globs
 *
 * @param {string} root project root
 * @param {Set<string>} knownFiles resolved set of scanned files
 * @param {string[]} userEntries extra glob patterns from CLI
 * @returns {Promise<Set<string>>}
 */
export async function resolveEntryPoints(root, knownFiles, userEntries = []) {
  const entries = new Set();

  // Walk every package.json in the tree (monorepo-aware).
  const pkgFiles = await fg('**/package.json', {
    cwd: root,
    absolute: true,
    ignore: ['**/node_modules/**'],
  });

  for (const pkgFile of pkgFiles) {
    let pkg;
    try {
      pkg = JSON.parse(await fs.readFile(pkgFile, 'utf8'));
    } catch {
      continue;
    }
    const pkgDir = path.dirname(pkgFile);
    const specifiers = collectPkgEntrySpecifiers(pkg);
    for (const spec of specifiers) {
      const normalized = spec.startsWith('.') ? spec : './' + spec;
      const resolved = resolveImport(
        path.join(pkgDir, 'package.json'),
        normalized,
        knownFiles
      );
      if (resolved) entries.add(resolved);
    }
  }

  // User-supplied entry globs.
  if (userEntries.length) {
    const matched = await fg(userEntries, {
      cwd: root,
      absolute: true,
      ignore: ['**/node_modules/**'],
    });
    for (const m of matched) if (knownFiles.has(m)) entries.add(m);
  }

  return entries;
}

function collectPkgEntrySpecifiers(pkg) {
  const out = [];
  if (typeof pkg.main === 'string') out.push(pkg.main);
  if (typeof pkg.module === 'string') out.push(pkg.module);

  if (typeof pkg.bin === 'string') out.push(pkg.bin);
  else if (pkg.bin && typeof pkg.bin === 'object') out.push(...Object.values(pkg.bin));

  collectExportsField(pkg.exports, out);
  return out.filter((s) => typeof s === 'string');
}

function collectExportsField(exp, out) {
  if (!exp) return;
  if (typeof exp === 'string') {
    out.push(exp);
    return;
  }
  if (typeof exp === 'object') {
    for (const value of Object.values(exp)) collectExportsField(value, out);
  }
}

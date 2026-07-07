import path from 'node:path';
import fg from 'fast-glob';
import { scanFile } from './scanners/file.js';
import { analyze } from './analyzers/graph.js';
import { resolveEntryPoints } from './analyzers/entrypoints.js';
import { JS_EXTENSIONS } from './utils/paths.js';

const DEFAULT_IGNORE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
  '**/.next/**',
  '**/*.d.ts',
];

/**
 * Run a full dead-code analysis over a project.
 *
 * @param {object} options
 * @param {string} [options.cwd] project root (default: process.cwd())
 * @param {string[]} [options.patterns] file globs to scan
 * @param {string[]} [options.ignore] extra ignore globs
 * @param {string[]} [options.entry] extra entry-point globs (kept as public API)
 * @param {boolean} [options.includeTests] treat test files as scannable (default true)
 * @returns {Promise<object>} analysis result
 */
export async function findDeadCode(options = {}) {
  const root = path.resolve(options.cwd || process.cwd());
  const patterns =
    options.patterns && options.patterns.length
      ? options.patterns
      : ['**/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts}'];

  const ignore = [...DEFAULT_IGNORE, ...(options.ignore || [])];

  const files = await fg(patterns, {
    cwd: root,
    absolute: true,
    ignore,
    dot: false,
  });

  const supported = files.filter((f) => JS_EXTENSIONS.includes(path.extname(f)));

  // Scan all files in parallel.
  const records = await Promise.all(
    supported.map((f) => scanFile(f).catch(() => null))
  );

  const fileMap = new Map();
  for (const rec of records) {
    if (rec) fileMap.set(rec.path, rec);
  }

  const knownFiles = new Set(fileMap.keys());
  const entryFiles = await resolveEntryPoints(root, knownFiles, options.entry || []);

  const result = analyze(fileMap, { entryFiles });
  result.root = root;
  return result;
}

export { analyze, scanFile };

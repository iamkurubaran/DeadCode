import path from 'node:path';

const JS_EXTENSIONS = ['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.mts', '.cts'];
const INDEX_FILES = JS_EXTENSIONS.map((ext) => `index${ext}`);

/**
 * Resolve a relative import specifier against the importing file's directory
 * to an absolute file path on disk. Handles extensionless imports and
 * directory/index resolution the way bundlers and Node do.
 *
 * @param {string} fromFile absolute path of the file containing the import
 * @param {string} specifier the raw import string (e.g. './utils' or '../a.js')
 * @param {Set<string>} knownFiles set of absolute file paths we scanned
 * @returns {string|null} absolute resolved path, or null if unresolved
 */
export function resolveImport(fromFile, specifier, knownFiles) {
  // Only resolve relative imports. Bare specifiers are external packages.
  if (!specifier.startsWith('.')) return null;

  const base = path.resolve(path.dirname(fromFile), specifier);

  // 1. Exact match (import already had an extension)
  if (knownFiles.has(base)) return base;

  // 2. Try appending each known extension
  for (const ext of JS_EXTENSIONS) {
    const candidate = base + ext;
    if (knownFiles.has(candidate)) return candidate;
  }

  // 3. Directory import -> index file
  for (const indexFile of INDEX_FILES) {
    const candidate = path.join(base, indexFile);
    if (knownFiles.has(candidate)) return candidate;
  }

  // 4. Handle the case where the specifier pointed at a .js file
  //    but the source on disk is .ts (common in TS projects using
  //    ESM-style ".js" import specifiers).
  const parsed = path.parse(base);
  if (parsed.ext) {
    const withoutExt = path.join(parsed.dir, parsed.name);
    for (const ext of JS_EXTENSIONS) {
      const candidate = withoutExt + ext;
      if (knownFiles.has(candidate)) return candidate;
    }
  }

  return null;
}

export function toRelative(root, file) {
  return path.relative(root, file) || path.basename(file);
}

export { JS_EXTENSIONS };

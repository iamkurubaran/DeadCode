import { resolveImport } from '../utils/paths.js';

/**
 * Build a cross-file module graph and compute which exports are never
 * imported anywhere in the project.
 *
 * Key ideas that make this monorepo-aware (vs per-file linters):
 *   1. We resolve every relative import to a concrete file on disk.
 *   2. Usage is aggregated ACROSS all files: an export is "used" if ANY
 *      other file imports it (by name, namespace, or via export-star chains).
 *   3. Entry points (bin, main, exports in package.json, and user globs) are
 *      roots whose exports are always considered "used" (public API surface).
 *
 * @param {Map<string, object>} fileMap  absPath -> scanFile() record
 * @param {object} opts
 * @param {Set<string>} opts.entryFiles  absolute paths treated as public roots
 * @returns {{
 *   unused: Array<{file:string, name:string, line:number, kind:string}>,
 *   totalExports: number,
 *   usedExports: number,
 *   fileCount: number
 * }}
 */
export function analyze(fileMap, { entryFiles = new Set() } = {}) {
  const knownFiles = new Set(fileMap.keys());

  // usage[targetFile] = Set of names consumed from that file (or '*' for all)
  const usage = new Map();
  const markUsed = (file, name) => {
    if (!usage.has(file)) usage.set(file, new Set());
    usage.get(file).add(name);
  };

  // Track re-export star edges so we can propagate usage transitively:
  // if file A does `export * from B` and something imports name X from A,
  // then X counts as used in B too.
  const starReexports = new Map(); // file -> [targetFile,...]

  // ---- First pass: resolve imports and record direct usage --------------
  for (const [absPath, record] of fileMap) {
    for (const imp of record.imports) {
      const target = resolveImport(absPath, imp.specifier, knownFiles);
      if (!target) continue; // external package or unresolved

      if (imp.sideEffectOnly) {
        // Side-effect import doesn't consume any named export, but keeps the
        // module "reachable". We record nothing name-specific.
        continue;
      }

      if (imp.namespace) {
        markUsed(target, '*');
        // A namespace/star re-export also creates a passthrough edge.
        starReexports.set(absPath, [...(starReexports.get(absPath) || []), target]);
        continue;
      }

      for (const name of imp.names) {
        markUsed(target, name);
      }
    }
  }

  // ---- Mark entry-point exports as used (public API) --------------------
  for (const entry of entryFiles) {
    if (fileMap.has(entry)) markUsed(entry, '*');
  }

  // ---- Propagate usage through export-star chains -----------------------
  // If names are consumed from a barrel file that re-exports *, those names
  // may actually live in the re-exported target.
  propagateStarUsage(fileMap, usage, starReexports, knownFiles, markUsed);

  // ---- Second pass: determine unused exports ----------------------------
  const unused = [];
  let totalExports = 0;
  let usedExports = 0;

  for (const [absPath, record] of fileMap) {
    const usedHere = usage.get(absPath);
    const allUsed = usedHere && usedHere.has('*');

    for (const exp of record.exports) {
      if (exp.kind === 'star') continue; // re-export star isn't a named export
      totalExports++;

      const isUsed = allUsed || (usedHere && usedHere.has(exp.name));

      if (isUsed) {
        usedExports++;
      } else {
        unused.push({
          file: absPath,
          name: exp.name,
          line: exp.line,
          kind: exp.kind,
        });
      }
    }
  }

  return {
    unused,
    totalExports,
    usedExports,
    fileCount: fileMap.size,
  };
}

/**
 * When a barrel re-exports `* from './target'`, and some file imports named
 * bindings from the barrel, we can't know which names came from which target.
 * Conservative rule: if a barrel has any '*' usage OR named usage, propagate
 * '*' to all its star-reexport targets. This avoids false positives (marking
 * genuinely-used code as dead) at the cost of occasionally missing dead code.
 */
function propagateStarUsage(fileMap, usage, starReexports, knownFiles, markUsed) {
  let changed = true;
  const guard = new Set();
  while (changed) {
    changed = false;
    for (const [absPath, record] of fileMap) {
      // Does this file re-export * from somewhere?
      const starTargets = [];
      for (const imp of record.imports) {
        if (imp.namespace && imp.specifier.startsWith('.')) {
          const target = resolveImport(absPath, imp.specifier, knownFiles);
          if (target) starTargets.push(target);
        }
      }
      if (starTargets.length === 0) continue;

      const usedHere = usage.get(absPath);
      const consumed = usedHere && usedHere.size > 0;
      if (!consumed) continue;

      for (const target of starTargets) {
        const key = absPath + '->' + target;
        const before = usage.get(target)?.size || 0;
        markUsed(target, '*');
        const after = usage.get(target).size;
        if (after !== before && !guard.has(key)) {
          guard.add(key);
          changed = true;
        }
      }
    }
  }
}

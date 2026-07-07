/**
 * Extract imports from (stripped) source. Returns an array of
 * { specifier, names, namespace, sideEffectOnly }.
 *
 *  - names: array of imported binding names as they exist in the *source*
 *           module (i.e. the original exported names, resolving `as`).
 *  - namespace: true if `import * as X` or `require(...)` whole-module use,
 *               meaning ANY export of the target could be used.
 *  - sideEffectOnly: `import './x'` with no bindings.
 */
export function extractImports(code) {
  const imports = [];

  // ---- ESM: import ... from 'spec' -------------------------------------
  for (const m of code.matchAll(/\bimport\s+([^;'"]*?)\s+from\s*['"]([^'"]+)['"]/g)) {
    const clause = m[1].trim();
    const specifier = m[2];
    imports.push(parseImportClause(clause, specifier));
  }

  // ---- ESM: bare import 'spec' (side-effect only) ----------------------
  for (const m of code.matchAll(/\bimport\s*['"]([^'"]+)['"]/g)) {
    imports.push({
      specifier: m[1],
      names: [],
      namespace: false,
      sideEffectOnly: true,
    });
  }

  // ---- ESM: dynamic import('spec') -------------------------------------
  for (const m of code.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    // Dynamic import returns the namespace object -> any export may be used.
    imports.push({
      specifier: m[1],
      names: [],
      namespace: true,
      sideEffectOnly: false,
    });
  }

  // ---- ESM: export { a } from 'spec' / export * from 'spec' ------------
  for (const m of code.matchAll(/\bexport\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g)) {
    imports.push({
      specifier: m[2],
      names: parseReexportSourceNames(m[1]),
      namespace: false,
      sideEffectOnly: false,
    });
  }
  for (const m of code.matchAll(/\bexport\s*\*\s*from\s*['"]([^'"]+)['"]/g)) {
    imports.push({
      specifier: m[1],
      names: [],
      namespace: true, // re-export star consumes everything
      sideEffectOnly: false,
    });
  }

  // ---- CJS: const X = require('spec') / destructured -------------------
  for (const m of code.matchAll(
    /\b(?:const|let|var)\s+(\{[^}]*\}|[A-Za-z_$][\w$]*)\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/g
  )) {
    const binding = m[1].trim();
    const specifier = m[2];
    if (binding.startsWith('{')) {
      imports.push({
        specifier,
        names: parseReexportSourceNames(binding.replace(/[{}]/g, '')),
        namespace: false,
        sideEffectOnly: false,
      });
    } else {
      imports.push({ specifier, names: [], namespace: true, sideEffectOnly: false });
    }
  }

  // ---- CJS: bare require('spec') ---------------------------------------
  for (const m of code.matchAll(/(?<![.\w$])require\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    // Only count as side-effect if not already captured by an assignment.
    imports.push({
      specifier: m[1],
      names: [],
      namespace: false,
      sideEffectOnly: true,
    });
  }

  return dedupe(imports);
}

function parseImportClause(clause, specifier) {
  const result = { specifier, names: [], namespace: false, sideEffectOnly: false };
  if (!clause) {
    result.sideEffectOnly = true;
    return result;
  }

  // import * as NS from '...'
  if (/^\*\s+as\s+[A-Za-z_$][\w$]*$/.test(clause)) {
    result.namespace = true;
    return result;
  }

  // Default binding + optional named/namespace
  // Examples: "Foo", "Foo, { a, b }", "Foo, * as NS", "{ a, b as c }"
  let rest = clause;

  // Leading default import (not a brace, not a star)
  const defaultMatch = rest.match(/^([A-Za-z_$][\w$]*)\s*(?:,|$)/);
  if (defaultMatch && !rest.startsWith('{') && !rest.startsWith('*')) {
    result.names.push('default');
    rest = rest.slice(defaultMatch[0].length).trim();
  }

  if (rest.startsWith('*')) {
    result.namespace = true;
    return result;
  }

  const braceMatch = rest.match(/\{([^}]*)\}/);
  if (braceMatch) {
    for (const name of parseReexportSourceNames(braceMatch[1])) {
      result.names.push(name);
    }
  }

  if (result.names.length === 0 && !result.namespace) {
    result.sideEffectOnly = true;
  }
  return result;
}

/**
 * Given the inside of `{ ... }` in an import/re-export, return the names as
 * they exist in the *source* module. For `a as b`, the source name is `a`.
 */
function parseReexportSourceNames(inner) {
  const names = [];
  for (let part of inner.split(',')) {
    part = part.trim().replace(/^type\s+/, '');
    if (!part) continue;
    const asMatch = part.match(/^([A-Za-z_$][\w$]*)\s+as\s+/);
    if (asMatch) {
      names.push(asMatch[1]);
    } else {
      const m = part.match(/^([A-Za-z_$][\w$]*)/);
      if (m) names.push(m[1]);
    }
  }
  return names;
}

function dedupe(imports) {
  const map = new Map();
  for (const imp of imports) {
    const existing = map.get(imp.specifier);
    if (!existing) {
      map.set(imp.specifier, {
        specifier: imp.specifier,
        names: new Set(imp.names),
        namespace: imp.namespace,
        sideEffectOnly: imp.sideEffectOnly,
      });
    } else {
      imp.names.forEach((n) => existing.names.add(n));
      existing.namespace = existing.namespace || imp.namespace;
      existing.sideEffectOnly = existing.sideEffectOnly && imp.sideEffectOnly;
    }
  }
  return [...map.values()].map((e) => ({
    specifier: e.specifier,
    names: [...e.names],
    namespace: e.namespace,
    sideEffectOnly: e.sideEffectOnly && e.names.size === 0 && !e.namespace,
  }));
}

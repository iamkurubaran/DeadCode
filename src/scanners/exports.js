/**
 * Extract exported names from a piece of (comment/string-stripped) source.
 * Returns an array of { name, line, kind } where name === 'default' for
 * default exports and '*' for a re-export star.
 */
export function extractExports(code) {
  const results = [];
  const seen = new Set();

  const add = (name, index, kind) => {
    if (!name) return;
    const key = name + ':' + index;
    if (seen.has(key)) return;
    seen.add(key);
    results.push({ name, line: lineAt(code, index), kind });
  };

  // export default ...
  for (const m of code.matchAll(/\bexport\s+default\b/g)) {
    add('default', m.index, 'default');
  }

  // export const/let/var NAME  (also multiple: export const a = 1, b = 2)
  // Capture the whole declaration up to the statement terminator so that
  // additional comma-separated bindings after an `=` are not lost.
  for (const m of code.matchAll(/\bexport\s+(?:const|let|var)\s+([\s\S]*?)(?:;|\n)/g)) {
    for (const name of parseBindingNames(m[1])) add(name, m.index, 'variable');
  }

  // export function NAME / export async function NAME / export function* NAME
  for (const m of code.matchAll(
    /\bexport\s+(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)/g
  )) {
    add(m[1], m.index, 'function');
  }

  // export class NAME
  for (const m of code.matchAll(/\bexport\s+(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/g)) {
    add(m[1], m.index, 'class');
  }

  // TypeScript: export interface/type/enum NAME
  for (const m of code.matchAll(
    /\bexport\s+(?:declare\s+)?(?:interface|type|enum|namespace)\s+([A-Za-z_$][\w$]*)/g
  )) {
    add(m[1], m.index, 'type');
  }

  // export { a, b as c }  and  export { a } from './x'
  for (const m of code.matchAll(/\bexport\s*\{([^}]*)\}(\s*from\s*['"][^'"]*['"])?/g)) {
    for (const name of parseExportSpecifiers(m[1])) add(name, m.index, 'named');
  }

  // export * from './x' - re-export star (treated as a usage passthrough)
  for (const m of code.matchAll(/\bexport\s*\*\s*from\s*['"][^'"]*['"]/g)) {
    add('*', m.index, 'star');
  }

  // CommonJS: module.exports.NAME = / exports.NAME =
  for (const m of code.matchAll(/\b(?:module\.)?exports\.([A-Za-z_$][\w$]*)\s*=/g)) {
    add(m[1], m.index, 'cjs');
  }

  // CommonJS: module.exports = { a, b, c }
  for (const m of code.matchAll(/\bmodule\.exports\s*=\s*\{([^}]*)\}/g)) {
    for (const name of parseObjectKeys(m[1])) add(name, m.index, 'cjs');
  }

  return results;
}

function parseBindingNames(fragment) {
  // Handles: "a = 1, b = 2" and destructuring "{ a, b }" / "[a, b]".
  // We split on TOP-LEVEL commas only (depth 0), so commas inside an
  // initializer like `a = f(1, 2), b = 3` don't create phantom bindings.
  const names = [];
  const parts = splitTopLevel(fragment);
  for (let part of parts) {
    part = part.trim();
    if (!part) continue;
    // Take only the binding side (before '=').
    const binding = part.split('=')[0].trim();
    // Destructuring pattern -> pull each identifier.
    if (/^[{[]/.test(binding)) {
      const inner = binding.replace(/[{}[\]]/g, ' ');
      for (const seg of inner.split(',')) {
        const m = seg.trim().match(/([A-Za-z_$][\w$]*)\s*$/);
        if (m) names.push(m[1]);
      }
    } else {
      const m = binding.match(/^([A-Za-z_$][\w$]*)/);
      if (m) names.push(m[1]);
    }
  }
  return names;
}

function splitTopLevel(str) {
  const parts = [];
  let depth = 0;
  let current = '';
  for (const ch of str) {
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current);
  return parts;
}

function parseExportSpecifiers(inner) {
  // "a, b as c, type D" -> exported names are a, c, D
  const names = [];
  for (let part of inner.split(',')) {
    part = part.trim().replace(/^type\s+/, '');
    if (!part) continue;
    const asMatch = part.match(/\bas\s+([A-Za-z_$][\w$]*)/);
    if (asMatch) {
      names.push(asMatch[1]);
    } else {
      const m = part.match(/^([A-Za-z_$][\w$]*)/);
      if (m) names.push(m[1]);
    }
  }
  return names;
}

function parseObjectKeys(inner) {
  const names = [];
  for (const part of inner.split(',')) {
    const m = part.trim().match(/^([A-Za-z_$][\w$]*)/);
    if (m) names.push(m[1]);
  }
  return names;
}

function lineAt(code, index) {
  let line = 1;
  for (let i = 0; i < index && i < code.length; i++) {
    if (code[i] === '\n') line++;
  }
  return line;
}

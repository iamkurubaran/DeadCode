/**
 * Remove comments and string/template/regex literal *contents* from source
 * while preserving byte length and line structure, so that later regex-based
 * extraction never matches keywords that appear inside strings or comments.
 *
 * We replace removed characters with spaces (newlines preserved) so indices
 * stay stable and line counts remain accurate for reporting.
 *
 * This is a lightweight lexer - not a full parser - but it correctly handles
 * the tricky cases (regex vs division, template literals, nested comments in
 * strings) well enough for import/export discovery.
 *
 * @param {string} src
 * @returns {string}
 */
export function stripNonCode(src, defuseStrings = false) {
  const out = new Array(src.length);
  let i = 0;
  const n = src.length;

  // Tracks whether the previous significant token allows a regex to follow.
  let prevSignificant = '';

  const blank = (from, to) => {
    for (let k = from; k < to; k++) {
      out[k] = src[k] === '\n' ? '\n' : ' ';
    }
  };

  while (i < n) {
    const c = src[i];
    const next = src[i + 1];

    // Line comment
    if (c === '/' && next === '/') {
      let j = i + 2;
      while (j < n && src[j] !== '\n') j++;
      blank(i, j);
      i = j;
      continue;
    }

    // Block comment
    if (c === '/' && next === '*') {
      let j = i + 2;
      while (j < n && !(src[j] === '*' && src[j + 1] === '/')) j++;
      j = Math.min(j + 2, n);
      blank(i, j);
      i = j;
      continue;
    }

    // Strings: ' " `
    // We PRESERVE the quotes and contents (import/require specifiers live in
    // strings and must survive), but we neutralize any alphabetic run inside
    // the string so stray keywords like "export" in a path can't be matched
    // as code. Punctuation like . / ' " is kept intact.
    if (c === '"' || c === "'" || c === '`') {
      const quote = c;
      out[i] = c; // keep opening quote
      let j = i + 1;
      while (j < n) {
        if (src[j] === '\\') {
          out[j] = src[j];
          out[j + 1] = src[j + 1];
          j += 2;
          continue;
        }
        if (src[j] === quote) break;
        // When defusing, replace letters so keywords in strings can't match.
        out[j] = defuseStrings && /[A-Za-z]/.test(src[j]) ? 'x' : src[j];
        j++;
      }
      out[j] = quote; // keep closing quote
      i = j + 1;
      prevSignificant = 'str';
      continue;
    }

    // Regex literal - only if a regex can legally start here.
    if (c === '/' && canRegexFollow(prevSignificant)) {
      let j = i + 1;
      let inClass = false;
      let valid = false;
      while (j < n) {
        const cj = src[j];
        if (cj === '\\') {
          j += 2;
          continue;
        }
        if (cj === '[') inClass = true;
        else if (cj === ']') inClass = false;
        else if (cj === '/' && !inClass) {
          valid = true;
          break;
        } else if (cj === '\n') {
          break;
        }
        j++;
      }
      if (valid) {
        blank(i, j + 1);
        // skip flags
        let k = j + 1;
        while (k < n && /[a-z]/i.test(src[k])) {
          out[k] = ' ';
          k++;
        }
        i = k;
        prevSignificant = 'regex';
        continue;
      }
    }

    // Ordinary code character
    out[i] = c;
    if (!/\s/.test(c)) {
      prevSignificant = /[\w$)\].]/.test(c) ? 'value' : c;
    }
    i++;
  }

  return out.join('');
}

function canRegexFollow(prev) {
  // A regex cannot follow a value/identifier/closing bracket (that's division).
  if (prev === 'value' || prev === 'str' || prev === 'regex') return false;
  return true;
}

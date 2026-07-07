import { toRelative } from '../utils/paths.js';

export function reportJson(result, root) {
  const payload = {
    summary: {
      files: result.fileCount,
      totalExports: result.totalExports,
      usedExports: result.usedExports,
      unusedExports: result.unused.length,
    },
    unused: result.unused
      .map((u) => ({
        file: toRelative(root, u.file),
        name: u.name,
        line: u.line,
        kind: u.kind,
      }))
      .sort((a, b) =>
        a.file === b.file ? a.line - b.line : a.file.localeCompare(b.file)
      ),
  };
  console.log(JSON.stringify(payload, null, 2));
}

import path from 'node:path';
import pc from 'picocolors';
import { toRelative } from '../utils/paths.js';

const KIND_LABEL = {
  default: 'default export',
  variable: 'const/let/var',
  function: 'function',
  class: 'class',
  type: 'type/interface',
  named: 'named export',
  cjs: 'commonjs export',
};

export function reportTerminal(result, root) {
  const { unused, totalExports, usedExports, fileCount } = result;

  if (unused.length === 0) {
    console.log(
      pc.green('✔ No unused exports found') +
        pc.dim(
          ` — scanned ${fileCount} files, ${totalExports} exports all reachable.`
        )
    );
    return;
  }

  // Group by file for readable output.
  const byFile = new Map();
  for (const item of unused) {
    if (!byFile.has(item.file)) byFile.set(item.file, []);
    byFile.get(item.file).push(item);
  }

  console.log(
    pc.bold(pc.red(`✖ Found ${unused.length} unused export${unused.length === 1 ? '' : 's'}`)) +
      pc.dim(` across ${byFile.size} file${byFile.size === 1 ? '' : 's'}\n`)
  );

  const sortedFiles = [...byFile.keys()].sort();
  for (const file of sortedFiles) {
    const rel = toRelative(root, file);
    console.log(pc.underline(pc.cyan(rel)));
    const items = byFile.get(file).sort((a, b) => a.line - b.line);
    for (const item of items) {
      const loc = pc.dim(`${rel}:${item.line}`);
      const kind = pc.dim(`(${KIND_LABEL[item.kind] || item.kind})`);
      const name = item.name === 'default' ? pc.italic('default') : pc.yellow(item.name);
      console.log(`  ${pc.red('•')} ${name} ${kind}  ${loc}`);
    }
    console.log('');
  }

  const pct = totalExports ? Math.round((usedExports / totalExports) * 100) : 100;
  console.log(
    pc.dim(
      `Scanned ${fileCount} files · ${usedExports}/${totalExports} exports used (${pct}%)`
    )
  );
}

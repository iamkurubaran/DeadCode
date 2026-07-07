#!/usr/bin/env node
import process from 'node:process';
import pc from 'picocolors';
import { findDeadCode } from '../src/index.js';
import { reportTerminal } from '../src/reporters/terminal.js';
import { reportJson } from '../src/reporters/json.js';

const HELP = `
${pc.bold('dead-code')} — find unused exports across a monorepo

${pc.bold('USAGE')}
  dead-code [paths...] [options]

${pc.bold('ARGUMENTS')}
  paths                 One or more glob patterns to scan
                        (default: **/*.{js,jsx,mjs,cjs,ts,tsx,mts,cts})

${pc.bold('OPTIONS')}
  -e, --entry <glob>    Mark files as public API entry points (repeatable).
                        Their exports are never reported as dead.
  -i, --ignore <glob>   Extra ignore pattern (repeatable).
      --cwd <dir>       Project root to analyze (default: current directory).
      --json            Output machine-readable JSON.
      --fail-on-found   Exit with code 1 if any dead exports are found (CI).
  -h, --help            Show this help.
  -v, --version         Show version.

${pc.bold('EXAMPLES')}
  dead-code
  dead-code "packages/**/*.ts" --entry "packages/*/src/index.ts"
  dead-code --json --fail-on-found
  dead-code src --ignore "**/*.stories.tsx"
`;

async function main() {
  const argv = process.argv.slice(2);
  const opts = {
    patterns: [],
    entry: [],
    ignore: [],
    cwd: undefined,
    json: false,
    failOnFound: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case '-h':
      case '--help':
        console.log(HELP);
        return 0;
      case '-v':
      case '--version': {
        const { readFile } = await import('node:fs/promises');
        const { fileURLToPath } = await import('node:url');
        const url = new URL('../package.json', import.meta.url);
        const pkg = JSON.parse(await readFile(fileURLToPath(url), 'utf8'));
        console.log(pkg.version);
        return 0;
      }
      case '-e':
      case '--entry':
        opts.entry.push(argv[++i]);
        break;
      case '-i':
      case '--ignore':
        opts.ignore.push(argv[++i]);
        break;
      case '--cwd':
        opts.cwd = argv[++i];
        break;
      case '--json':
        opts.json = true;
        break;
      case '--fail-on-found':
        opts.failOnFound = true;
        break;
      default:
        if (arg.startsWith('-')) {
          console.error(pc.red(`Unknown option: ${arg}`));
          console.error(`Run ${pc.cyan('dead-code --help')} for usage.`);
          return 2;
        }
        opts.patterns.push(arg);
    }
  }

  const result = await findDeadCode({
    cwd: opts.cwd,
    patterns: opts.patterns,
    ignore: opts.ignore,
    entry: opts.entry,
  });

  if (opts.json) {
    reportJson(result, result.root);
  } else {
    reportTerminal(result, result.root);
  }

  if (opts.failOnFound && result.unused.length > 0) return 1;
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(pc.red('dead-code crashed:'), err.message);
    process.exit(2);
  });

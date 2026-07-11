# @iamkurubaran/dead-code

A fast, zero-config CLI for finding exports that are imported nowhere in your project or monorepo.

[![npm version](https://img.shields.io/npm/v/@iamkurubaran/dead-code.svg)](https://www.npmjs.com/package/@iamkurubaran/dead-code)
[![npm downloads](https://img.shields.io/npm/dm/@iamkurubaran/dead-code.svg)](https://www.npmjs.com/package/@iamkurubaran/dead-code)
[![Node.js](https://img.shields.io/badge/node-18%2B-339933.svg)](https://nodejs.org)
[![License: MIT](https://img.shields.io/npm/l/@iamkurubaran/dead-code.svg)](LICENSE)
[![npm package](https://img.shields.io/badge/npm-%40iamkurubaran%2Fdead-code-blue?logo=npm)](https://www.npmjs.com/package/@iamkurubaran/dead-code)
[![Support @iamkurubaran on Chai4Me](https://chai4.me/badge.svg)](https://chai4.me/iamkurubaran)

## Package

- npm: https://www.npmjs.com/package/@iamkurubaran/dead-code

## Why this tool exists

Dead exports are easy to miss in growing codebases. They often linger long after refactors or API cleanup, which can make maintenance harder than it needs to be.

This CLI helps you find exports that are no longer consumed anywhere in your repository so you can remove them with confidence.

## Features

- Cross-file and cross-package analysis for monorepos
- Zero configuration and no build step required
- Support for ES modules, CommonJS, and TypeScript syntax
- Entry-point awareness for public APIs and package exports
- Human-readable terminal output and JSON output for CI

## Installation

```bash
npm install --save-dev @iamkurubaran/dead-code
```

Or run it directly with npx:

```bash
npx @iamkurubaran/dead-code
```

Requirements: Node.js 18 or newer.

## Quick start

From the root of your project:

```bash
npx @iamkurubaran/dead-code
```

Protect a public API from being reported as unused by adding entry points:

```bash
dead-code --entry "src/index.ts" --entry "src/index.js"
```

Fail CI when dead exports are found:

```bash
dead-code --fail-on-found --entry "src/index.ts"
```

## CLI reference

```bash
dead-code [paths...] [options]
```

### Common options

- `-e, --entry <glob>`: treat matching files as public entry points
- `-i, --ignore <glob>`: exclude additional files or patterns
- `--cwd <dir>`: analyze a different project root
- `--json`: emit structured JSON output
- `--fail-on-found`: exit with code `1` when unused exports are found
- `-h, --help`: show help
- `-v, --version`: show the installed version

## Programmatic API

```js
import { findDeadCode } from '@iamkurubaran/dead-code';

const result = await findDeadCode({
  cwd: process.cwd(),
  patterns: ['src/**/*.ts'],
  entry: ['src/index.ts'],
  ignore: ['**/*.test.ts']
});

console.log(result.unused);
```

## Development

```bash
git clone https://github.com/iamkurubaran/DeadCode.git
cd DeadCode
npm install
npm test
```

## Contributing

Contributions are welcome. Open an issue or submit a pull request if you want to improve the analyzer, add support for new syntax, or improve the documentation.

## License

MIT © Kurubaran Anandhan

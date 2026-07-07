# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.2] - 2026-07-07

### Fixed

- Applied minor bug fixes and stability improvements.

## [1.0.1] - 2026-07-07

### Changed

- Updated repository references and packaging metadata to point to the correct GitHub repository.
- Refreshed the README to be more polished, professional, and developer-friendly.

## [1.0.0] - 2026-07-07

### Added

- Initial release.
- Cross-file, monorepo-aware detection of unused exports.
- Static analysis for ES modules (named, default, namespace, dynamic `import()`,
  re-exports, `as` aliases), CommonJS (`require`, destructured require,
  `module.exports`, `exports.x`), and TypeScript (`interface`, `type`, `enum`,
  `namespace`, `export type`).
- Automatic entry-point discovery from every `package.json` in the tree
  (`main`, `module`, `bin`, `exports`) plus user-supplied `--entry` globs.
- Extensionless and `index.*` directory import resolution, including `.js`
  specifiers that resolve to `.ts` sources.
- Barrel (`export * from`) usage propagation to avoid false positives.
- Human-readable terminal reporter and machine-readable `--json` reporter.
- `--fail-on-found` flag for CI pipelines.
- Programmatic API via `findDeadCode()`.

[1.0.2]: https://github.com/iamkurubaran/DeadCode/releases/tag/v1.0.2
[1.0.1]: https://github.com/iamkurubaran/DeadCode/releases/tag/v1.0.1
[1.0.0]: https://github.com/iamkurubaran/DeadCode/releases/tag/v1.0.0

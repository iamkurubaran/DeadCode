# Sandbox build notes

Repository: https://github.com/iamkurubaran/DeadCode

This archive includes a `node_modules/` folder containing **minimal offline
shims** for the two runtime dependencies (`fast-glob`, `picocolors`) so the
package runs and its tests pass without a network connection in a sandbox.

For real use and before publishing, run:

    npm install

which replaces the shims with the actual published dependencies declared in
`package.json`. Everything else (source, CLI, tests, docs) is production code.

See PUBLISHING.md for the full publish workflow.

## Quick start

    npm install         # pull real deps
    npm test            # run the test suite (10 tests)
    node bin/cli.js     # scan the current directory

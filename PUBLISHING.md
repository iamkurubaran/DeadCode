# Publishing to npm

This package is configured and ready to publish under the scoped name
`@iamkurubaran/dead-code`.

## Before you publish

1. **Install real dependencies** (this repo ships with tiny offline shims in
   `node_modules/` so it runs without a network; a real install replaces them):

   ```bash
   npm install
   ```

2. **Run the test suite** (also runs automatically on publish via
   `prepublishOnly`):

   ```bash
   npm test
   ```

3. **Preview the exact tarball contents:**

   ```bash
   npm pack --dry-run
   ```

## Publish

1. Make sure you are logged in to npm with an account that owns the
   `@iamkurubaran` scope:

   ```bash
   npm login
   npm whoami
   ```

2. Publish. The package sets `publishConfig.access = "public"`, so a scoped
   package publishes publicly without extra flags:

   ```bash
   npm publish
   ```

## Notes

- **Package name.** The unscoped name `dead-code` is in a crowded namespace on
  npm, so this package uses the scoped name `@iamkurubaran/dead-code`, which is
  guaranteed available to your account and always publishable. The CLI binary
  is still called `dead-code`.
- **To use an unscoped name instead,** change the `"name"` field in
  `package.json` to an available name and remove the `publishConfig` block if
  you prefer restricted defaults.
- **Repository URLs** in `package.json` point to
  `github.com/iamkurubaran/DeadCode`. Update them if you host the repo elsewhere.
- **Versioning.** Use `npm version patch|minor|major` to bump the version and
  create a matching git tag before publishing.

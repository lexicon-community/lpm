# lpm

Lexicon package manager for atproto schemas.

## Install

```
deno install --global --allow-all jsr:@lpm/cli --name lpm
```

You can also run the CLI directly with `deno run` without installing it
globally:

```
deno run jsr:@lpm/cli --version
```

For experimental Node.js support, see further below.

## Usage

### `add <nsid | pattern>`

```
lpm add app.bsky.feed.post
lpm add app.bsky.actor.*
```

Lexicons are stored in `./lexicons` along with a manifest at `./lexicons.json`.

Supports wildcards in the last segment.

### `fetch`

```
lpm fetch
```

Fetches all lexicons defied in `lexicons.json` and their dependencies.

### `view <nsid>`

```
lpm view app.bsky.feed.post
```

View metadata about a lexicon such as it's direct dependencies and the authority
DID.

### `tree --depth=<number> <nsid>`

```
lpm tree app.bsky.feed.post
lpm tree app.bsky.graph.defs --depth 3
```

Resolves the tree of lexicons starting at a specific NSID. Denotes circular
dependencies with a yellow circle.

## ⚠️ Experimental Node.js Support

Lpm is built using Deno but it's also possible to run it with Node.js. This is experimental for now as it's a bit fiddly to setup.

First step is to install it with your package manager of choice:

```bash
# pnpm 10.9+
pnpm add jsr:@lpm/cli

# yarn 4.9+
yarn add jsr:@lpm/cli

# npm, bun, and older versions of yarn or pnpm
npx jsr add @lpm/cli # replace npx with any of yarn dlx, pnpm dlx, or bunx
```

Note, above we don't install it globally, but rather as a project dependency. To run it, we can execute `./node_modules/@lpm/cli/bin.js`

```bash
node ./node_modules/@lpm/cli/bin.js --help
```

You can add a script to your `package.json` to make it easier to run:

```json
{
  "scripts": {
    "lpm": "node ./node_modules/@lpm/cli/bin.js"
  }
}
```

Then you can run it with:

```bash
# npm
# Note the extra `--` that allows passing arguments to the script
npm run lpm -- --version

# pnpm/yarn/bun (no extra `--` needed)
pnpm lpm --version
yarn lpm --version
bun lpm --version
```

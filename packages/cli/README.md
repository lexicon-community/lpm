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

import { SchemaService } from "../src/schema.ts";
import assert from "node:assert/strict";
import { Effect } from "effect";
import { NSID } from "../src/nsid.ts";
import { testEffect } from "./helpers.ts";
import { Container } from "../src/container.ts";

testEffect(
  "resolves uri",
  Effect.gen(function* () {
    const resolve = yield* SchemaService;
    const resolution = yield* resolve(yield* NSID.parse("com.atproto.lexicon.schema"));
    assert.equal(
      resolution.uri.toString(),
      "at://did:plc:6msi3pj7krzih5qxqtryxlzw/com.atproto.lexicon.schema/com.atproto.lexicon.schema",
    );
  }).pipe(Effect.provide(Container)),
);

testEffect(
  "node children",
  Effect.gen(function* () {
    const resolve = yield* SchemaService;

    const resolution = yield* resolve(yield* NSID.parse("app.bsky.actor.profile"));

    assert.equal(resolution.children.length, 2);
    assert.deepEqual(
      resolution.children.map((nsid) => nsid.toString()),
      ["com.atproto.label.defs", "com.atproto.repo.strongRef"],
    );
  }).pipe(Effect.provide(Container)),
);

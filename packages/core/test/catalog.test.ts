import { Chunk, Effect, Stream } from "effect";
import { testEffect } from "./helpers.ts";
import { Catalog } from "../src/catalog.ts";
import { NSID } from "../src/nsid.ts";
import assert from "node:assert/strict";

testEffect(
  "catalog resolve",
  Effect.gen(function* () {
    const catalog = yield* Catalog;

    const stream = yield* catalog.resolve([yield* NSID.parse("app.bsky.feed.post")]);

    const uris = yield* stream.pipe(
      Stream.map((res) => {
        return res.uri.toString();
      }),
      Stream.runCollect,
    );

    const expected = [
      "at://did:plc:4v4y5r3lwsbtmsxhile2ljac/com.atproto.lexicon.schema/app.bsky.actor.defs",
      "at://did:plc:4v4y5r3lwsbtmsxhile2ljac/com.atproto.lexicon.schema/app.bsky.embed.defs",
      "at://did:plc:4v4y5r3lwsbtmsxhile2ljac/com.atproto.lexicon.schema/app.bsky.embed.external",
      "at://did:plc:4v4y5r3lwsbtmsxhile2ljac/com.atproto.lexicon.schema/app.bsky.embed.images",
      "at://did:plc:4v4y5r3lwsbtmsxhile2ljac/com.atproto.lexicon.schema/app.bsky.embed.record",
      "at://did:plc:4v4y5r3lwsbtmsxhile2ljac/com.atproto.lexicon.schema/app.bsky.embed.recordWithMedia",
      "at://did:plc:4v4y5r3lwsbtmsxhile2ljac/com.atproto.lexicon.schema/app.bsky.embed.video",
      "at://did:plc:4v4y5r3lwsbtmsxhile2ljac/com.atproto.lexicon.schema/app.bsky.feed.defs",
      "at://did:plc:4v4y5r3lwsbtmsxhile2ljac/com.atproto.lexicon.schema/app.bsky.feed.post",
      "at://did:plc:4v4y5r3lwsbtmsxhile2ljac/com.atproto.lexicon.schema/app.bsky.graph.defs",
      "at://did:plc:4v4y5r3lwsbtmsxhile2ljac/com.atproto.lexicon.schema/app.bsky.labeler.defs",
      "at://did:plc:4v4y5r3lwsbtmsxhile2ljac/com.atproto.lexicon.schema/app.bsky.richtext.facet",
      "at://did:plc:6msi3pj7krzih5qxqtryxlzw/com.atproto.lexicon.schema/com.atproto.label.defs",
      "at://did:plc:6msi3pj7krzih5qxqtryxlzw/com.atproto.lexicon.schema/com.atproto.repo.strongRef",
    ];

    assert.deepEqual(new Set(Chunk.toArray(uris)), new Set(expected));
    assert.equal(uris.length, expected.length);
  }),
);

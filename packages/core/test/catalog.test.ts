import { Chunk, Effect, Stream } from "effect";
import { testEffect } from "./helpers.ts";
import { Catalog } from "../src/catalog.ts";
import { NSID } from "../src/nsid.ts";
import assert from "node:assert/strict";
import { Container } from "../src/container.ts";

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
  }).pipe(Effect.provide(Container)),
);

testEffect(
  "doesn't resolve the same uri twice",
  Effect.gen(function* () {
    const catalog = yield* Catalog;

    const stream = yield* catalog.resolve([yield* NSID.parse("app.bsky.feed.post")]);
    const uris = Chunk.toArray(
      yield* stream.pipe(
        Stream.map((res) => {
          return res.uri.toString();
        }),
        Stream.runCollect,
      ),
    );

    const duplicateUris = uris.filter((uri) => uris.filter((u) => u === uri).length > 1);

    assert.deepEqual(new Set(duplicateUris), new Set());
  }).pipe(Effect.provide(Container)),
);

// test("can validate a post record", async () => {
//   const NSID_STR = "app.bsky.feed.post";
//   const catalog = bootstrap(Catalog);
//   const resolutions = [];
//   for await (const resolution of catalog.resolve([
//     catalog.get(NSID.parse(NSID_STR)),
//   ])) {
//     assertSuccessfullResolution(resolution);
//     resolutions.push(resolution);
//   }

//   const client = new AtpBaseClient("https://api.bsky.app");

//   const postUris = [
//     "at://did:plc:2xau7wbgdq4phuou2ypwuen7/app.bsky.feed.post/3ljmvgixb327d",
//   ].map((uri) => new AtUri(uri));

//   const records = await Promise.all(
//     postUris.map((uri) =>
//       client.com.atproto.repo.getRecord({
//         repo: uri.host,
//         collection: uri.collection,
//         rkey: uri.rkey,
//       }),
//     ),
//   );

//   const lexicons = new Lexicons(resolutions.map((r) => r.doc));

//   for (const record of records) {
//     const result = lexicons.validate(NSID_STR, record.data.value);
//     assert.equal(
//       result.success,
//       true,
//       `Failed to validate ${record.data.uri}: ${
//         // @ts-expect-error result.error isn't narrowed
//         result.error
//       }`,
//     );
//   }
// });

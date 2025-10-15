import { SchemaService } from "../src/schema.ts";
import assert from "node:assert/strict";
import { Effect } from "effect";
import { NSID } from "../src/nsid.ts";
import { testEffect } from "./helpers.ts";

testEffect(
  "resolves uri",
  Effect.gen(function* () {
    const resolve = yield* SchemaService;
    const resolution = yield* resolve(yield* NSID.parse("com.atproto.lexicon.schema"));
    assert.equal(
      resolution.uri.toString(),
      "at://did:plc:6msi3pj7krzih5qxqtryxlzw/com.atproto.lexicon.schema/com.atproto.lexicon.schema",
    );
  }),
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
  }),
);

// test("catalog resolve", async () => {
//   const catalog = bootstrap(Catalog);

//   const uris = [];

//   for await (const resolution of catalog.resolve([
//     catalog.get(NSID.parse("app.bsky.feed.post")),
//   ])) {
//     assertSuccessfullResolution(resolution);
//     uris.push(resolution.uri.toString());
//     console.log(resolution.uri.toString());
//     // console.log(JSON.stringify(resolution, null, 2));
//   }

//   // assertEquals(uris, [
//   //   "at://did:plc:4v4y5r3lwsbtmsxhile2ljac/com.atproto.lexicon.schema/app.bsky.feed.getPosts",
//   //   "at://did:plc:4v4y5r3lwsbtmsxhile2ljac/com.atproto.lexicon.schema/app.bsky.feed.defs",
//   //   "at://did:plc:4v4y5r3lwsbtmsxhile2ljac/com.atproto.lexicon.schema/app.bsky.actor.defs",
//   //   "at://did:plc:6msi3pj7krzih5qxqtryxlzw/com.atproto.lexicon.schema/com.atproto.label.defs",
//   //   "at://did:plc:4v4y5r3lwsbtmsxhile2ljac/com.atproto.lexicon.schema/app.bsky.richtext.facet",
//   //   "at://did:plc:4v4y5r3lwsbtmsxhile2ljac/com.atproto.lexicon.schema/app.bsky.graph.defs",
//   //   "at://did:plc:6msi3pj7krzih5qxqtryxlzw/com.atproto.lexicon.schema/com.atproto.repo.strongRef",
//   // ]);
// });

// test("doesn't resolve the same uri twice", async () => {
//   const catalog = bootstrap(Catalog);
//   const uris: string[] = [];

//   for await (const resolution of catalog.resolve([
//     catalog.get(NSID.parse("app.bsky.feed.post")),
//   ])) {
//     assertSuccessfullResolution(resolution);
//     uris.push(resolution.uri.toString());
//   }

//   const duplicateUris = uris.filter(
//     (uri) => uris.filter((u) => u === uri).length > 1,
//   );

//   assert.deepEqual(new Set(duplicateUris), new Set());
// });

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

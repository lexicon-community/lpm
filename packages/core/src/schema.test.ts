import { AtUri, NSID } from "@atproto/syntax";
import type { Resolution } from "./schema.ts";
import { Catalog } from "./catalog.ts";
import { assertEquals, assertObjectMatch } from "jsr:@std/assert";
import { bootstrap } from "@needle-di/core";
import { Lexicons } from "@atproto/lexicon";
import { AtpBaseClient } from "@atproto/api";

function assertSuccessfullResolution(
  data: Resolution,
  msg?: string,
): asserts data is Resolution & { success: true } {
  assertObjectMatch(data, { success: true }, msg);
}

Deno.test("resolves uri", async () => {
  const catalog = bootstrap(Catalog);

  const resolution = await catalog
    .get(NSID.parse("com.atproto.lexicon.schema"))
    .resolve();

  assertSuccessfullResolution(resolution);
  assertEquals(
    resolution.uri.toString(),
    "at://did:plc:6msi3pj7krzih5qxqtryxlzw/com.atproto.lexicon.schema/com.atproto.lexicon.schema",
  );
});

Deno.test("node children", async () => {
  const catalog = bootstrap(Catalog);

  const resolution = await catalog
    .get(NSID.parse("app.bsky.actor.profile"))
    .resolve();
  assertSuccessfullResolution(resolution);
  console.log(resolution.uri.toString());

  assertEquals(resolution.children.length, 2);
  assertEquals(
    resolution.children.map((nsid) => nsid.toString()),
    [
      "com.atproto.label.defs",
      "com.atproto.repo.strongRef",
    ],
  );
});

Deno.test("catalog resolve", async () => {
  const catalog = bootstrap(Catalog);

  const uris = [];

  for await (
    const resolution of catalog.resolve([
      catalog.get(NSID.parse("app.bsky.feed.post")),
    ])
  ) {
    assertSuccessfullResolution(resolution);
    uris.push(resolution.uri.toString());
    console.log(resolution.uri.toString());
    // console.log(JSON.stringify(resolution, null, 2));
  }

  // assertEquals(uris, [
  //   "at://did:plc:4v4y5r3lwsbtmsxhile2ljac/com.atproto.lexicon.schema/app.bsky.feed.getPosts",
  //   "at://did:plc:4v4y5r3lwsbtmsxhile2ljac/com.atproto.lexicon.schema/app.bsky.feed.defs",
  //   "at://did:plc:4v4y5r3lwsbtmsxhile2ljac/com.atproto.lexicon.schema/app.bsky.actor.defs",
  //   "at://did:plc:6msi3pj7krzih5qxqtryxlzw/com.atproto.lexicon.schema/com.atproto.label.defs",
  //   "at://did:plc:4v4y5r3lwsbtmsxhile2ljac/com.atproto.lexicon.schema/app.bsky.richtext.facet",
  //   "at://did:plc:4v4y5r3lwsbtmsxhile2ljac/com.atproto.lexicon.schema/app.bsky.graph.defs",
  //   "at://did:plc:6msi3pj7krzih5qxqtryxlzw/com.atproto.lexicon.schema/com.atproto.repo.strongRef",
  // ]);
});

Deno.test("doesn't resolve the same uri twice", async () => {
  const catalog = bootstrap(Catalog);
  const uris: string[] = [];

  for await (
    const resolution of catalog.resolve([
      catalog.get(NSID.parse("app.bsky.feed.post")),
    ])
  ) {
    assertSuccessfullResolution(resolution);
    uris.push(resolution.uri.toString());
  }

  const duplicateUris = uris.filter(
    (uri) => uris.filter((u) => u === uri).length > 1,
  );

  assertEquals(new Set(duplicateUris), new Set());
});

Deno.test("can validate a post record", async () => {
  const NSID_STR = "app.bsky.feed.post";
  const catalog = bootstrap(Catalog);
  const resolutions = [];
  for await (
    const resolution of catalog.resolve([
      catalog.get(NSID.parse(NSID_STR)),
    ])
  ) {
    assertSuccessfullResolution(resolution);
    resolutions.push(resolution);
  }

  const client = new AtpBaseClient("https://api.bsky.app");

  const postUris = [
    "at://did:plc:2xau7wbgdq4phuou2ypwuen7/app.bsky.feed.post/3ljmvgixb327d",
  ].map((uri) => new AtUri(uri));

  const records = await Promise.all(
    postUris.map((uri) =>
      client.com.atproto.repo.getRecord({
        repo: uri.host,
        collection: uri.collection,
        rkey: uri.rkey,
      })
    ),
  );

  const lexicons = new Lexicons(resolutions.map((r) => r.doc));

  for (const record of records) {
    const result = lexicons.validate(NSID_STR, record.data.value);
    assertEquals(
      result.success,
      true,
      `Failed to validate ${record.data.uri}: ${
        // @ts-expect-error result.error isn't narrowed
        result.error}`,
    );
  }
});

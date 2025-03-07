import { NSID } from "@atproto/syntax";
import type { Resolution } from "./node.ts";
import { NodeRegistry } from "./node-registry.ts";
import { assertEquals, assertObjectMatch } from "jsr:@std/assert";
import { bootstrap } from "@needle-di/core";
import { Lexicons } from "@atproto/lexicon";
import { skip } from "node:test";

function assertSuccessfullResolution(
  data: Resolution,
  msg?: string,
): asserts data is Resolution & { success: true } {
  assertObjectMatch(data, { success: true }, msg);
}

Deno.test("resolves uri", async () => {
  const registry = bootstrap(NodeRegistry);

  const resolution = await registry
    .get(NSID.parse("com.atproto.lexicon.schema"))
    .resolve();

  assertSuccessfullResolution(resolution);
  assertEquals(
    resolution.uri.toString(),
    "at://did:plc:6msi3pj7krzih5qxqtryxlzw/com.atproto.lexicon.schema/com.atproto.lexicon.schema",
  );
});

Deno.test("node children", async () => {
  const registry = bootstrap(NodeRegistry);

  const resolution = await registry
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

Deno.test("registry resolve", async () => {
  const registry = bootstrap(NodeRegistry);

  const uris = [];

  for await (
    const resolution of registry.resolve([
      registry.get(NSID.parse("app.bsky.feed.post")),
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
  const registry = bootstrap(NodeRegistry);
  const uris: string[] = [];

  for await (
    const resolution of registry.resolve([
      registry.get(NSID.parse("app.bsky.feed.post")),
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

Deno.test,
  skip("can validate a post record", async () => {
    const NSID_STR = "app.bsky.feed.post";
    const registry = bootstrap(NodeRegistry);
    const resolutions = [];
    for await (
      const resolution of registry.resolve([
        registry.get(NSID.parse(NSID_STR)),
      ])
    ) {
      assertSuccessfullResolution(resolution);
      resolutions.push(resolution);
    }

    const lexicons = new Lexicons(resolutions.map((r) => r.doc));

    const exampleRecords = [
      '{"uri":"at://did:plc:2xau7wbgdq4phuou2ypwuen7/app.bsky.feed.post/3ljrsfbuuyk2g","cid":"bafyreigjrpyhhk5fibcajhhtkcefmxptntgx35t5zngvsxwwvu56hzioaq","value":{"text":"To update a globally installed CLI in deno you pass -fr\\n\\nfr fr","$type":"app.bsky.feed.post","langs":["en"],"createdAt":"2025-03-07T10:28:47.874Z"}}',
      '{"uri":"at://did:plc:yosojsta3nm5qiod5zqixzur/app.bsky.feed.post/3ljpreuc6fs2c","cid":"bafyreihyt2ckoxoyusimrexuxatuwazct7uiskukhspxic756inddofipy","value":{"text":"DOGE “seemed unsure” of what USAID programs they cut and is now attempting to reverse some of the cuts, says @propublica.org reporter Brett Murphy. “This is the opposite of a careful review.\\"","$type":"app.bsky.feed.post","embed":{"$type":"app.bsky.embed.video","video":{"$type":"blob","ref":{"$link":"bafkreidowys6ntilo4wslx23jishxiqfrwywqmxxer4sy2r6y5orwuosn4"},"mimeType":"video/mp4","size":8408607},"aspectRatio":{"width":1280,"height":720}},"langs":["en"],"facets":[{"$type":"app.bsky.richtext.facet","index":{"byteEnd":128,"byteStart":113},"features":[{"did":"did:plc:k4jt6heuiamymgi46yeuxtpt","$type":"app.bsky.richtext.facet#mention"}]}],"createdAt":"2025-03-06T15:05:20.412Z"}}',
    ].map((s) => JSON.parse(s).value);

    for (const exampleRecord of exampleRecords) {
      const result = lexicons.validate(NSID_STR, exampleRecord);
      // @ts-expect-error result.error isn't narrowed
      assertEquals(result.success, true, `Failed to validate: ${result.error}`);
    }
  });

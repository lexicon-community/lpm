import { NSID } from "@atproto/syntax";
import { Resolution } from "./node.ts";
import { NodeRegistry } from "./node-registry.ts";
import { assertEquals, assertObjectMatch } from "jsr:@std/assert";
import { bootstrap } from "@needle-di/core";

function assertSuccessfullResolution(
  data: Resolution,
  msg?: string
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
    "at://did:plc:6msi3pj7krzih5qxqtryxlzw/com.atproto.lexicon.schema/com.atproto.lexicon.schema"
  );
});

Deno.test("node children", async () => {
  const registry = bootstrap(NodeRegistry);

  const resolution = await registry
    .get(NSID.parse("app.bsky.actor.profile"))
    .resolve();
  assertSuccessfullResolution(resolution);
  console.log(resolution.uri.toString());

  assertEquals(resolution.children.length, 1);
  assertEquals(
    resolution.children[0].nsid.toString(),
    "com.atproto.repo.strongRef"
  );
});

Deno.test.only("registry resolve", async () => {
  const registry = bootstrap(NodeRegistry);

  const uris = [];

  for await (const resolution of registry.resolve([
    NSID.parse("community.lexicon.calendar.event"),
  ])) {
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

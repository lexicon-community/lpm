import { AtUri } from "@atproto/syntax";
import { NSID } from "@atproto/syntax";
import { Commands } from "./commands.ts";
import { globalContainer } from "./container.ts";
import { NodeRegistry } from "./node-registry.ts";
import { Node } from "./node.ts";

// Temporarily mocking registry because strongRef isn't published yet
class MockedNodeRegistry extends NodeRegistry {
  override get(nsid: NSID): Node {
    if (
      ["com.atproto.repo.strongRef", "com.atproto.label.defs"].includes(
        nsid.toString()
      )
    ) {
      return {
        nsid,
        // @ts-expect-error
        async resolve() {
          return {
            nsid,
            children: [],
            doc: { defs: [] },
            success: true,
            uri: new AtUri(
              `at://did:plc:6msi3pj7krzih5qxqtryxlzw/com.atproto.lexicon.schema/${nsid.toString()}`
            ),
          };
        },
      };
    }

    return super.get(nsid);
  }
}
globalContainer.bind({
  provide: NodeRegistry,
  useClass: MockedNodeRegistry,
});

await globalContainer.get(Commands).fetch();

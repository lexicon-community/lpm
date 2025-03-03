import { inject, injectable } from "@needle-di/core";
import { NSID } from "@atproto/syntax";
import { NodeRegistry } from "./node-registry.ts";
import { NSIDAuthorityService } from "./nsid-authority.ts";
import { AtUri } from "@atproto/api";
import { AtpFetchToken } from "./fetch.ts";
import type { Node } from "./node.ts";
import { createAtprotoClient } from "./atproto-client.ts";

export class NSIDPattern {
  base: NSID;

  constructor(pattern: string) {
    const base = pattern.replace(/\.\*$/, "");
    if (base.includes("*")) {
      throw new Error(
        "Wildcard is only allowed in the last segment of the pattern",
      );
    }

    this.base = NSID.parse(base);
  }
}

@injectable()
export class NSIDPatternResolver {
  constructor(
    private nsidAuthorityService: NSIDAuthorityService = inject(
      NSIDAuthorityService,
    ),
    private registry: NodeRegistry = inject(NodeRegistry),
    private fetch: typeof globalThis.fetch = inject(AtpFetchToken),
  ) {}

  /**
   * Resolve a pattern to a list of Nodes.
   *
   * @param pattern The pattern string can be a single NSID or an NSID with a wildcard in the last segment ONLY.
   */
  async resolvePattern(pattern: NSIDPattern): Promise<Node[]> {
    const authority = await this.nsidAuthorityService.resolve(pattern);
    if (!authority) {
      throw new Error("No authority found for NSID");
    }

    const client = createAtprotoClient(authority.pds, this.fetch);

    const nodes = [];

    for await (
      const page of paginate((cursor) =>
        client.com.atproto.repo.listRecords({
          repo: authority.did,
          collection: "com.atproto.lexicon.schema",
          limit: 100,
          cursor,
        }).then((res) => res.data)
      )
    ) {
      for (const record of page.records) {
        const uri = new AtUri(record.uri);
        if (uri.rkey.startsWith(pattern.base.toString())) {
          nodes.push(this.registry.get(NSID.parse(uri.rkey)));
        }
      }
    }

    return nodes;
  }
}

async function* paginate<Page extends { cursor?: string }>(
  fetcher: (cursor?: string) => Promise<Page>,
): AsyncIterable<Page> {
  let cursor;
  do {
    const page = await fetcher(cursor);
    yield page;
    cursor = page.cursor;
  } while (cursor);
}

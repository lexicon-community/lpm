export * from "./src/node.ts";
export * from "./src/node-registry.ts";
export * from "./src/nsid-pattern.ts";

import { Container } from "@needle-di/core";
import { NodeRegistry } from "./src/node-registry.ts";
import { NSID } from "@atproto/syntax";
import type { Resolution } from "./src/node.ts";
import dns from "node:dns/promises";
import { DnsService } from "./src/dns.ts";

export function resolveNSIDs(
  nsids: string[],
): AsyncIterable<Resolution> {
  const container = new Container();

  container.bind(
    class NodeDnsService extends DnsService {
      override resolveTxt(domain: string): Promise<string[][]> {
        return dns.resolveTxt(domain);
      }
    },
  );

  const registry = container.get(NodeRegistry);
  const nodes = nsids.map((nsid) => registry.get(NSID.parse(nsid)));
  const resolutions = registry.resolve(nodes);
  return resolutions;
}

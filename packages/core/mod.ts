export * from "./src/schema.ts";
export * from "./src/node-registry.ts";
export * from "./src/nsid-pattern.ts";

import { Container } from "@needle-di/core";
import { NodeRegistry } from "./src/node-registry.ts";
import { NSID } from "@atproto/syntax";
import type { Resolution } from "./src/schema.ts";
import dns from "node:dns/promises";
import { DnsService } from "./src/dns.ts";

export function getRegistry(): NodeRegistry {
  const container = new Container();
  container.bind(
    class NodeDnsService extends DnsService {
      override resolveTxt(domain: string): Promise<string[][]> {
        return dns.resolveTxt(domain);
      }
    },
  );
  return container.get(NodeRegistry);
}

export function resolveNSIDs(
  nsids: string[],
): AsyncIterable<Resolution> {
  const registry = getRegistry();
  const schemas = nsids.map((nsid) => registry.get(NSID.parse(nsid)));
  const resolutions = registry.resolve(schemas);
  return resolutions;
}

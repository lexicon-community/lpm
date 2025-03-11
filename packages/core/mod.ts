export * from "./src/schema.ts";
export * from "./src/catalog.ts";
export * from "./src/nsid-pattern.ts";

import { Container } from "@needle-di/core";
import { Catalog } from "./src/catalog.ts";
import { NSID } from "@atproto/syntax";
import type { Resolution } from "./src/schema.ts";
import dns from "node:dns/promises";
import { DnsService } from "./src/dns.ts";

export function getCatalog(): Catalog {
  const container = new Container();
  container.bind(
    class NodeDnsService extends DnsService {
      override resolveTxt(domain: string): Promise<string[][]> {
        return dns.resolveTxt(domain);
      }
    },
  );
  return container.get(Catalog);
}

export function resolveNSIDs(
  nsids: string[],
): AsyncIterable<Resolution> {
  const catalog = getCatalog();
  const schemas = nsids.map((nsid) => catalog.get(NSID.parse(nsid)));
  const resolutions = catalog.resolve(schemas);
  return resolutions;
}

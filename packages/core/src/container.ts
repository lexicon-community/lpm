import { Layer } from "effect";
import { Catalog } from "./catalog.ts";
import { SchemaService } from "./schema.ts";
import { DnsService } from "./dns.ts";
import { FetchService } from "./fetch.ts";
import { DidResolver, NSIDAuthorityService } from "./nsid-authority.ts";

export const Container = Catalog.Default.pipe(
  Layer.provideMerge(SchemaService.Default),
  Layer.provideMerge(FetchService.Default),
  Layer.provideMerge(NSIDAuthorityService.Default),
  Layer.provideMerge(DnsService.Default),
  Layer.provideMerge(DidResolver.Default),
);

export type ContainerRequirement = typeof Container extends Layer.Layer<infer R> ? R : never;

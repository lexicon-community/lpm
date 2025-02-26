import { createContainer } from "./typed-inject.ts";
import { NodeRegistry } from "./node-registry.ts";
import { DidResolver } from "@atproto/identity";
import { Commands, FileSystem } from "./commands.ts";
import { AtpFetch, DnsResolver } from "./container-tokens.ts";

export const globalContainer = createContainer([
  Commands,
  FileSystem,
  NodeRegistry,
  {
    provide: DidResolver,
    useFactory: () => new DidResolver({}),
  },
  {
    provide: DnsResolver,
    useFactory: () => Deno.resolveDns,
  },
  {
    provide: AtpFetch,
    useValue: fetch,
  },
]);

export type GlobalContainer = typeof globalContainer;

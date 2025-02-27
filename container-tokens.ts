import { InjectionToken } from "@needle-di/core";
import { DidResolver } from "@atproto/identity";

export const AtpFetchToken = new InjectionToken(Symbol("AtpFetch"), {
  factory: () => fetch,
});

export const DnsResolverToken = new InjectionToken(Symbol("DnsResolver"), {
  factory: () => Deno.resolveDns,
});

export const DidResolverToken = new InjectionToken(Symbol("DidResolver"), {
  factory: () => new DidResolver({}),
});

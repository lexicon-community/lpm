import { InjectionToken } from "@needle-di/core";

export const DnsResolverToken = new InjectionToken(Symbol("DnsResolver"), {
  factory: () => Deno.resolveDns,
});

export type DnsResolver = typeof Deno.resolveDns;

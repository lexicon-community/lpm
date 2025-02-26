import { InjectionToken } from "@needle-di/core";

export const AtpFetch = new InjectionToken<typeof fetch>("ATP_FETCH_TOKEN");

export const DnsResolver = new InjectionToken<typeof Deno.resolveDns>(
  "DNS_RESOLVER_TOKEN"
);

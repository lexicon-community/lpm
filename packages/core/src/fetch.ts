import { InjectionToken } from "@needle-di/core";
import type { FetchHandler } from "@atproto/xrpc";

export const AtpFetchToken = new InjectionToken(Symbol("AtpFetch"), {
  factory: () => fetch as FetchHandler,
});

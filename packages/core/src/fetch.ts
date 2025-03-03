import { InjectionToken } from "@needle-di/core";

export const AtpFetchToken = new InjectionToken(Symbol("AtpFetch"), {
  factory: () => fetch,
});

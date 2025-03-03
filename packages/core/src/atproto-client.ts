import { AtpBaseClient } from "@atproto/api";

export function createAtprotoClient(
  pds: string,
  fetch: typeof globalThis.fetch,
) {
  return new AtpBaseClient((input, init) =>
    fetch(
      new URL(input, pds),
      // @ts-ignore Deno getting confused with undici types for some reason?
      init,
    )
  );
}

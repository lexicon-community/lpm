export * from "./schema.ts";
export * from "./catalog.ts";
export * from "./nsid-pattern.ts";

import { SchemaService, type Resolution } from "./schema.ts";
import { Effect, Layer, Stream } from "effect";
import { Catalog } from "./catalog.ts";
import { NSID } from "./nsid.ts";
import { FetchService } from "./fetch.ts";
import { DidResolver, NSIDAuthorityService } from "./nsid-authority.ts";
import { DnsService } from "./dns.ts";

const resolveNSIDsEffect = (nsidStrs: string[]) =>
  Effect.gen(function* () {
    const catalog = yield* Catalog;
    const nsids = yield* Effect.all(nsidStrs.map((str) => NSID.parse(str)));
    const stream = yield* catalog.resolve(nsids);
    return Stream.toAsyncIterable(stream);
  });

const Container = Catalog.Default.pipe(
  Layer.provide(SchemaService.Default),
  Layer.provide(FetchService.Default),
  Layer.provide(NSIDAuthorityService.Default),
  Layer.provide(DnsService.Default),
  Layer.provide(DidResolver.Default),
);

export async function* resolveNSIDs(nsids: string[]): AsyncIterable<Resolution> {
  const runnable = Effect.provide(resolveNSIDsEffect(nsids), Container);
  const iterable = await Effect.runPromise(runnable);
  yield* iterable;
}

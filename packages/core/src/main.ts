export * from "./schema.ts";
export * from "./catalog.ts";
export * from "./nsid-pattern.ts";
export * from "./container.ts";

import { type Resolution } from "./schema.ts";
import { Effect, Stream } from "effect";
import { Catalog } from "./catalog.ts";
import { NSID } from "./nsid.ts";

import { Container } from "./container.ts";

const resolveNSIDsEffect = (nsidStrs: string[]) =>
  Effect.gen(function* () {
    const catalog = yield* Catalog;
    const nsids = yield* Effect.all(nsidStrs.map((str) => NSID.parse(str)));
    const stream = yield* catalog.resolve(nsids);
    return Stream.toAsyncIterable(stream);
  });

export async function* resolveNSIDs(nsids: string[]): AsyncIterable<Resolution> {
  const runnable = Effect.provide(resolveNSIDsEffect(nsids), Container);
  const iterable = await Effect.runPromise(runnable);
  yield* iterable;
}

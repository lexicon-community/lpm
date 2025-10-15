import { Effect } from "effect";

export class FetchService extends Effect.Service<FetchService>()("core/FetchService", {
  sync: () => globalThis.fetch,
}) {}

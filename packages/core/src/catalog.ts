import { Effect, Cache, Duration, Queue, Stream } from "effect";
import { type Resolution, SchemaService } from "./schema.ts";
import { NSID } from "./nsid.ts";

const catalogImpl = Effect.gen(function* () {
  const resolveCache = yield* Cache.make({
    capacity: 100,
    timeToLive: Duration.infinity,
    lookup: yield* SchemaService,
  });

  // const resolve2 = (roots: NSID[]) =>

  const resolve = (roots: NSID[]) =>
    Effect.gen(function* () {
      const queue = yield* Queue.bounded<Resolution>(100);

      const producer = Effect.gen(function* () {
        const rootResolutions = yield* Effect.all(
          roots.map((root) => resolveCache.get(root)),
          { concurrency: "unbounded" },
        );

        yield* queue.offerAll(rootResolutions);

        const seenSchemaNsids = new Set<string>();
        const workQueue = rootResolutions.flatMap((res) => res.children);

        while (workQueue.length > 0) {
          const currentBatch = workQueue.splice(0, workQueue.length);
          // Drop failures, we don't want to walk those
          const resolutions = yield* Effect.allSuccesses(
            currentBatch.map((nsid) => resolveCache.get(nsid)),
            { concurrency: "unbounded" },
          );

          for (const resolution of resolutions) {
            if (seenSchemaNsids.has(resolution.nsid.toString())) continue;
            yield* queue.offer(resolution);
            seenSchemaNsids.add(resolution.nsid.toString());
            const children = resolution.children.filter((nsid) => !seenSchemaNsids.has(nsid.toString()));
            workQueue.push(...children);
          }
        }
      });

      return Stream.merge(
        Stream.fromQueue(queue),
        // Merging with producer ensures that any errors are emitted on the stream
        // There is perhaps a better way to do this
        Stream.fromEffect(producer).pipe(Stream.drain),
        {
          haltStrategy: "either",
        },
      );
    });

  return {
    resolve,
    invalidate: (nsid: NSID) => resolveCache.invalidate(nsid),
  };
});

export class Catalog extends Effect.Service<Catalog>()("core/Catalog", {
  effect: catalogImpl,
}) {}

import { inject, injectable } from "@needle-di/core";
import { type Resolution, type Schema, SchemaFactory } from "./schema.ts";
import type { NSID } from "@atproto/syntax";

type CatalogConfig = {
  maxSize: number;
};

@injectable()
export class Catalog {
  #cache = new Map<string, Schema>();

  constructor(
    public readonly config: CatalogConfig = { maxSize: 150 },
    private schemaFactory: SchemaFactory = inject(SchemaFactory),
  ) {}

  get(nsid: NSID): Schema {
    const nsidStr = nsid.toString();
    const existingSchema = this.#cache.get(nsidStr);
    if (existingSchema) {
      return existingSchema;
    }

    if (this.#cache.size >= this.config.maxSize) {
      throw new CatalogSizeExceededError("Maximum catalog size reached");
    }

    const schema = this.schemaFactory.create(nsid);
    this.#cache.set(nsidStr, schema);
    return schema;
  }

  async *resolve(roots: Schema[]): AsyncIterable<Resolution> {
    const seenSchemaNsids = new Set<string>();

    const rootResolutions = await Promise.all(
      roots.map((root) => root.resolve()),
    );

    yield* rootResolutions;
    roots.forEach((root) => seenSchemaNsids.add(root.nsid.toString()));

    if (rootResolutions.some((res) => !res.success)) {
      // TODO: Bubble up error
      console.error("Error resolving root schemas");
      return;
    }

    const queue = rootResolutions.flatMap((res) =>
      res.success ? res.children : []
    );

    while (queue.length > 0) {
      const currentBatch = queue.splice(0, queue.length);
      const resolutions = await Promise.all(
        currentBatch.map((nsid) => this.get(nsid).resolve()),
      );

      for (const resolution of resolutions) {
        if (!seenSchemaNsids.has(resolution.nsid.toString())) {
          yield resolution;
          seenSchemaNsids.add(resolution.nsid.toString());
          if (resolution.success) {
            const children = resolution.children.filter(
              (nsid) => !seenSchemaNsids.has(nsid.toString()),
            );

            queue.push(...children);
          }
        }
      }
    }
  }

  invalidate(nsid: NSID) {
    this.#cache.delete(nsid.toString());
  }

  get size(): number {
    return this.#cache.size;
  }
}

class CatalogSizeExceededError extends Error {}

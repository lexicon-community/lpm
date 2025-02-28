import { inject, injectable } from "@needle-di/core";
import {
  AtpFetchToken,
  DidResolverToken,
  DnsResolverToken,
} from "./container-tokens.ts";
import { Node } from "./node.ts";
import type { NSID } from "@atproto/syntax";

type NodeRegistryConfig = {
  maxSize: number;
};

@injectable()
export class NodeRegistry {
  #cache = new Map<string, Node>();

  constructor(
    public readonly config: NodeRegistryConfig = { maxSize: 150 },
    private fetch = inject(AtpFetchToken),
    private resolveDns = inject(DnsResolverToken),
    private didResolver = inject(DidResolverToken)
  ) {}

  get(nsid: NSID) {
    const nsidStr = nsid.toString();
    const existingNode = this.#cache.get(nsidStr);
    if (existingNode) {
      return existingNode;
    }

    if (this.#cache.size >= this.config.maxSize) {
      throw new NodeRegistrySizeExceededError("Maximum registry size reached");
    }

    const node = new Node(
      nsid,
      this,
      this.fetch,
      this.resolveDns,
      this.didResolver
    );
    this.#cache.set(nsidStr, node);
    return node;
  }

  async *resolve(nsids: NSID[]) {
    const seenNodeNsids = new Set<string>();
    const roots = nsids.map((nsid) => this.get(nsid));

    const rootResolutions = await Promise.all(
      roots.map((root) => root.resolve())
    );

    yield* rootResolutions;
    roots.forEach((root) => seenNodeNsids.add(root.nsid.toString()));

    if (rootResolutions.some((res) => !res.success)) {
      // TODO: Return or throw errors
      return;
    }

    const queue = rootResolutions.flatMap((res) =>
      res.success ? res.children : []
    );

    while (queue.length > 0) {
      const currentBatch = queue.splice(0, queue.length);
      const resolutions = await Promise.all(
        currentBatch.map((node) => node.resolve())
      );

      for (const resolution of resolutions) {
        if (resolution.success) {
          const children = resolution.children.filter(
            (child) => !seenNodeNsids.has(child.nsid.toString())
          );
          children.forEach((child) => {
            seenNodeNsids.add(child.nsid.toString());
          });

          queue.push(...children);
        }
        yield resolution;
      }
    }
  }

  invalidate(nsid: NSID) {
    this.#cache.delete(nsid.toString());
  }

  get size() {
    return this.#cache.size;
  }
}

class NodeRegistrySizeExceededError extends Error {}

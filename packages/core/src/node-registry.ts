import { inject, injectable } from "@needle-di/core";
import { type Node, NodeFactory, type Resolution } from "./node.ts";
import type { NSID } from "@atproto/syntax";

type NodeRegistryConfig = {
  maxSize: number;
};

@injectable()
export class NodeRegistry {
  #cache = new Map<string, Node>();

  constructor(
    public readonly config: NodeRegistryConfig = { maxSize: 150 },
    private nodeFactory: NodeFactory = inject(NodeFactory),
  ) {}

  get(nsid: NSID): Node {
    const nsidStr = nsid.toString();
    const existingNode = this.#cache.get(nsidStr);
    if (existingNode) {
      return existingNode;
    }

    if (this.#cache.size >= this.config.maxSize) {
      throw new NodeRegistrySizeExceededError("Maximum registry size reached");
    }

    const node = this.nodeFactory.create(nsid);
    this.#cache.set(nsidStr, node);
    return node;
  }

  async *resolve(roots: Node[]): AsyncIterable<Resolution> {
    const seenNodeNsids = new Set<string>();

    const rootResolutions = await Promise.all(
      roots.map((root) => root.resolve()),
    );

    yield* rootResolutions;
    roots.forEach((root) => seenNodeNsids.add(root.nsid.toString()));

    if (rootResolutions.some((res) => !res.success)) {
      // TODO: Bubble up error
      console.error("Error resolving root nodes");
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
        if (!seenNodeNsids.has(resolution.nsid.toString())) {
          yield resolution;
          seenNodeNsids.add(resolution.nsid.toString());
          if (resolution.success) {
            const children = resolution.children.filter(
              (nsid) => !seenNodeNsids.has(nsid.toString()),
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

class NodeRegistrySizeExceededError extends Error {}

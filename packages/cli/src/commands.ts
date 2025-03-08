import { inject, injectable } from "@needle-di/core";
import {
  NodeRegistry,
  NSIDPattern,
  NSIDPatternResolver,
  type Resolution,
} from "@lpm/core";
import { NSID } from "@atproto/syntax";
import { emptyDir, ensureFile, exists } from "@std/fs";
import { Command } from "@cliffy/command";
import * as inputTypes from "./types.ts";
import * as fmt from "@std/fmt/colors";

@injectable()
export class FileSystem {
  writeText(path: string, data: string | ReadableStream<string>) {
    return Deno.writeTextFile(path, data);
  }

  readText(path: string) {
    return Deno.readTextFile(path);
  }

  exists(path: string) {
    return exists(path);
  }

  cwd() {
    return Deno.cwd();
  }
}

@injectable()
class ResolutionsDir {
  constructor(private fs = inject(FileSystem)) {}

  async writeResolution(resolution: Extract<Resolution, { success: true }>) {
    const manifestDir = this.fs.cwd();
    if (!manifestDir) {
      throw new Error("Could not determine manifest directory");
    }

    const path = `${manifestDir}/lexicons/${
      resolution.nsid.segments.join(
        "/",
      )
    }.json`;
    await ensureFile(path);
    await this.fs.writeText(path, JSON.stringify(resolution.doc, null, 2));
  }
}

export type CommandDescriptor = {
  // deno-lint-ignore no-explicit-any
  command: Command<any>;
  name: string;
};

@injectable()
export class FetchCommand implements CommandDescriptor {
  constructor(
    private fs = inject(FileSystem),
    private registry = inject(NodeRegistry),
    private resolutionsDir = inject(ResolutionsDir),
  ) {}

  name = "fetch";
  command = new Command()
    .description("Fetch and install lexicons from the manifest.")
    .action(() => this.#action());

  async #action() {
    // TODO: Configure this
    const manifestDir = this.fs.cwd();
    if (!manifestDir) {
      throw new Error("Could not determine manifest directory");
    }
    const manifestPath = manifestDir + "/lexicons.json";
    const nsids = JSON.parse(await this.fs.readText(manifestPath)).lexicons.map(
      (nsid: string) => NSID.parse(nsid),
    );

    await emptyDir(`${manifestDir}/lexicons`);

    for await (const resolution of this.registry.resolve(nsids)) {
      if (!resolution.success) {
        console.error("failed to resolve ", resolution.errorCode);
        continue;
      }

      await this.resolutionsDir.writeResolution(resolution);
    }
  }
}

@injectable()
export class AddCommand implements CommandDescriptor {
  constructor(
    private fs = inject(FileSystem),
    private registry = inject(NodeRegistry),
    private resolutionsDir = inject(ResolutionsDir),
    private nsidPatternResolver = inject(NSIDPatternResolver),
  ) {}

  name = "add";
  command = new Command()
    .description(
      "Add a lexicon to the manifest and fetch it. Supports either fully qualified NSIDs or NSID patterns.",
    )
    .example("Using NSID", "lpm add app.bsky.actor.profile")
    .example("Using NSID pattern", "lpm add 'app.bsky.actor.*'")
    .type("nsidOrPattern", inputTypes.nsidOrPattern)
    .arguments("<nsidOrPattern:nsidOrPattern>")
    .action((_, nsidOrPattern) => this.#action(nsidOrPattern));

  async #action(nsidOrPattern: NSID | NSIDPattern) {
    const manifestDir = this.fs.cwd();
    if (!manifestDir) {
      throw new Error("Could not determine manifest directory");
    }
    const manifestPath = manifestDir + "/lexicons.json";

    const manifest = (await this.fs.exists(manifestPath))
      ? JSON.parse(await this.fs.readText(manifestPath))
      : { lexicons: [] };

    const nodesToAdd = nsidOrPattern instanceof NSIDPattern
      ? await this.nsidPatternResolver.resolvePattern(
        nsidOrPattern,
      )
      : [this.registry.get(nsidOrPattern)];

    console.log("Fetching lexicons:");
    console.log(nodesToAdd.map((node) => node.nsid.toString()).join("\n"));

    manifest.lexicons = [
      ...new Set([
        ...manifest.lexicons,
        ...nodesToAdd.map(
          (node) => node.nsid.toString(),
        ),
      ]),
    ];
    await this.fs.writeText(manifestPath, JSON.stringify(manifest, null, 2));

    for await (const resolution of this.registry.resolve(nodesToAdd)) {
      if (!resolution.success) {
        console.error("failed to resolve ", resolution.errorCode);
        continue;
      }

      await this.resolutionsDir.writeResolution(resolution);
    }
  }
}

@injectable()
export class ViewCommand implements CommandDescriptor {
  constructor(private registry = inject(NodeRegistry)) {}

  name = "view";
  command = new Command()
    .description("View a lexicon.")
    .type("nsid", inputTypes.nsid)
    .arguments("<nsid:nsid>")
    .action((_, nsid) => this.#action(nsid));

  async #action(nsid: NSID) {
    const node = this.registry.get(nsid);
    const resolution = await node.resolve();
    if (!resolution.success) {
      console.error("failed to resolve ", resolution.errorCode);
      return;
    }

    console.log(`\n${fmt.bold(nsid.toString())}\n`);
    console.log(`uri: ${fmt.yellow(resolution.uri.toString())}`);
    const url = new URL(
      "/xrpc/com.atproto.repo.getRecord",
      resolution.pds,
    );
    url.searchParams.set("repo", resolution.uri.host);
    url.searchParams.set("collection", resolution.uri.collection);
    url.searchParams.set("rkey", resolution.uri.rkey);
    console.log(
      `record url: ${fmt.yellow(url.toString())}`,
    );

    console.log(
      `\ndependencies:\n${
        resolution.children.map((nsid) => `- ${fmt.bold(nsid.toString())}`)
          .join(
            "\n",
          )
      }`,
    );
  }
}

@injectable()
export class TreeCommand implements CommandDescriptor {
  constructor(private registry = inject(NodeRegistry)) {}

  name = "tree";

  command = new Command()
    .name("tree")
    .description("View a lexicon tree.")
    .type("nsid", inputTypes.nsid)
    .option("-d --depth <depth:number>", "The depth of the tree.", {
      default: Infinity,
    })
    .arguments("<nsid:nsid>")
    .action(({ depth }, nsid) => this.#action(nsid, depth));

  async #action(nsid: NSID, maxDepth: number) {
    const root = await this.registry.get(nsid).resolve();
    if (!root.success) {
      console.error("failed to resolve ", root.errorCode);
      return;
    }

    const getIndent = (ancestors: string[], isLast: boolean): string => {
      let indent = "";
      for (let i = 0; i < ancestors.length; i++) {
        indent += i === ancestors.length - 1
          ? `${isLast ? "└" : "├"}─── `
          : "│   ";
      }
      return indent;
    };

    const printNode = async (
      node: Resolution,
      ancestors: string[],
      isLast = false,
    ) => {
      if (!node.success) {
        throw new Error("failed to resolve");
      }
      const nodeId = node.nsid.toString();
      const indent = getIndent(ancestors, isLast);
      if (ancestors.includes(nodeId)) {
        console.log(`${indent}${nodeId} ${fmt.yellow("●")}`);
        return;
      }
      console.log(
        `${indent}${node.children.length === 0 ? nodeId : fmt.bold(nodeId)}`,
      );
      if (ancestors.length + 1 > maxDepth) {
        return;
      }

      for (const [i, child] of node.children.entries()) {
        const childResolution = await this.registry.get(child).resolve();
        const isLast = i === node.children.length - 1;
        await printNode(childResolution, [...ancestors, nodeId], isLast);
      }
    };

    await printNode(root, []);
  }
}

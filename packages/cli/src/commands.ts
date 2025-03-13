import { inject, injectable } from "@needle-di/core";
import {
  Catalog,
  NSIDPattern,
  NSIDPatternResolver,
  type Resolution,
  SchemaFactory,
} from "@lpm/core";
import { NSID } from "@atproto/syntax";
import { ensureFile, exists } from "@std/fs";
import { Command } from "@cliffy/command";
import * as inputTypes from "./types.ts";
import * as fmt from "@std/fmt/colors";
import { z } from "zod";

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

const Manifest = z.object({
  lexicons: z.array(z.string()),
});
type Manifest = z.infer<typeof Manifest>;

@injectable()
class ResolutionsDir {
  constructor(private fs = inject(FileSystem)) {}

  getRoot() {
    const manifestDir = this.fs.cwd();
    if (!manifestDir) {
      throw new Error("Could not determine manifest directory");
    }

    return manifestDir;
  }

  // TODO: Configure this
  async getManifest() {
    const manifestDir = this.getRoot();

    const manifestPath = manifestDir + "/lexicons.json";

    return (await this.fs.exists(manifestPath))
      ? Manifest.parse(JSON.parse(await this.fs.readText(manifestPath)))
      : { lexicons: [] };
  }

  async writeManifest(manifest: Manifest) {
    const manifestDir = this.fs.cwd();
    if (!manifestDir) {
      throw new Error("Could not determine manifest directory");
    }

    const manifestPath = manifestDir + "/lexicons.json";
    await this.fs.writeText(manifestPath, JSON.stringify(manifest, null, 2));
  }

  async writeResolution(resolution: Extract<Resolution, { success: true }>) {
    const manifestDir = this.getRoot();

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
    private catalog = inject(Catalog),
    private resolutionsDir = inject(ResolutionsDir),
    private schemaFactory = inject(SchemaFactory),
  ) {}

  name = "fetch";
  command = new Command()
    .description("Fetch and install lexicons from the manifest.")
    .action(() => this.#action());

  async #action() {
    const manifest = await this.resolutionsDir.getManifest();
    const roots = manifest.lexicons.map(
      (nsid: string) => this.schemaFactory.create(NSID.parse(nsid)),
    );

    for await (const resolution of this.catalog.resolve(roots)) {
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
    private catalog = inject(Catalog),
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

    const schemasToAdd = nsidOrPattern instanceof NSIDPattern
      ? await this.nsidPatternResolver.resolvePattern(
        nsidOrPattern,
      )
      : [this.catalog.get(nsidOrPattern)];

    console.log("Fetching lexicons:");
    console.log(
      schemasToAdd.map((schema) => schema.nsid.toString()).join("\n"),
    );

    manifest.lexicons = [
      ...new Set([
        ...manifest.lexicons,
        ...schemasToAdd.map(
          (schema) => schema.nsid.toString(),
        ),
      ]),
    ];
    await this.fs.writeText(manifestPath, JSON.stringify(manifest, null, 2));

    for await (const resolution of this.catalog.resolve(schemasToAdd)) {
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
  constructor(private catalog = inject(Catalog)) {}

  name = "view";
  command = new Command()
    .description("View a lexicon.")
    .type("nsid", inputTypes.nsid)
    .arguments("<nsid:nsid>")
    .action((_, nsid) => this.#action(nsid));

  async #action(nsid: NSID) {
    const schema = this.catalog.get(nsid);
    const resolution = await schema.resolve();
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
  constructor(private catalog = inject(Catalog)) {}

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
    const root = await this.catalog.get(nsid).resolve();
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

    const printResolution = async (
      resolution: Resolution,
      ancestors: string[],
      isLast = false,
    ) => {
      if (!resolution.success) {
        throw new Error("failed to resolve");
      }
      const schemaId = resolution.nsid.toString();
      const indent = getIndent(ancestors, isLast);
      if (ancestors.includes(schemaId)) {
        console.log(`${indent}${schemaId} ${fmt.yellow("●")}`);
        return;
      }
      console.log(
        `${indent}${
          resolution.children.length === 0 ? schemaId : fmt.bold(schemaId)
        }`,
      );
      if (ancestors.length + 1 > maxDepth) {
        return;
      }

      for (const [i, child] of resolution.children.entries()) {
        const childResolution = await this.catalog.get(child).resolve();
        const isLast = i === resolution.children.length - 1;
        await printResolution(
          childResolution,
          [...ancestors, schemaId],
          isLast,
        );
      }
    };

    await printResolution(root, []);
  }
}

@injectable()
export class CheckCommand implements CommandDescriptor {
  constructor(private catalog = inject(Catalog)) {}

  name = "check";
  command = new Command()
    .description("Check lexicons for issues.")
    .type("nsid", inputTypes.nsid)
    .arguments("<nsids...:nsid>")
    .action((_, ...nsids) => this.#action(nsids));

  async #action(nsids: [NSID, ...NSID[]]) {
    const resolutionResults = await Promise.allSettled(
      nsids.map(async (nsid) => {
        const resolution = await this.catalog.get(nsid).resolve();

        if (!resolution.success) {
          throw new CheckError(resolution.nsid, resolution.errorCode);
        }

        // - All direct children must resolve
        // - All references must point to a valid def inside those children
      }),
    );
  }
}

class CheckError extends Error {
  nsid: NSID;
  constructor(nsid: NSID, message: string, options?: ErrorOptions) {
    super(message, options);
    this.nsid = nsid;
  }
}

import { inject, injectable } from "@needle-di/core";
import { NodeRegistry, type Resolution } from "@lpm/core";
import { NSID } from "@atproto/syntax";
import { ensureFile, emptyDir, exists } from "@std/fs";
import { type ArgumentValue, Command } from "@cliffy/command";

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

    const path = `${manifestDir}/lexicons/${resolution.nsid.segments.join(
      "/"
    )}.json`;
    await ensureFile(path);
    await this.fs.writeText(path, JSON.stringify(resolution.doc, null, 2));
  }
}

export type CommandDescriptor = {
  // deno-lint-ignore no-explicit-any
  command: Command<any>;
  name: string;
};

function nsidType({ label, name, value }: ArgumentValue): NSID {
  if (!NSID.isValid(value)) {
    throw new Error(
      `${label} "${name}" must be a valid NSID, but got "${value}"`
    );
  }

  return NSID.parse(value);
}

@injectable()
export class FetchCommand implements CommandDescriptor {
  constructor(
    private fs = inject(FileSystem),
    private registry = inject(NodeRegistry),
    private resolutionsDir = inject(ResolutionsDir)
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
    const manifestPath = manifestDir + "/manifest.json";
    const nsids = JSON.parse(await this.fs.readText(manifestPath)).lexicons.map(
      (nsid: string) => NSID.parse(nsid)
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
    private resolutionsDir = inject(ResolutionsDir)
  ) {}

  name = "add";
  command = new Command()
    .description("Add a lexicon to the manifest and fetch it.")
    .type("nsid", nsidType)
    .arguments("<nsid:nsid>")
    .action((_, nsid: NSID) => this.#action(nsid));

  async #action(nsid: NSID) {
    const manifestDir = this.fs.cwd();
    if (!manifestDir) {
      throw new Error("Could not determine manifest directory");
    }
    const manifestPath = manifestDir + "/manifest.json";

    const manifest = (await this.fs.exists(manifestPath))
      ? JSON.parse(await this.fs.readText(manifestPath))
      : { lexicons: [] };

    manifest.lexicons.push(nsid.toString());

    await this.fs.writeText(manifestPath, JSON.stringify(manifest, null, 2));

    for await (const resolution of this.registry.resolve([nsid])) {
      if (!resolution.success) {
        console.error("failed to resolve ", resolution.errorCode);
        continue;
      }

      await this.resolutionsDir.writeResolution(resolution);
    }
  }
}

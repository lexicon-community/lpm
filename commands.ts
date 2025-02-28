import { inject, injectable } from "@needle-di/core";
import { NodeRegistry } from "./node-registry.ts";
import { NSID } from "@atproto/syntax";
import { ensureFile, emptyDir } from "jsr:@std/fs";
import { Command } from "@cliffy/command";

@injectable()
export class FileSystem {
  writeText(path: string, data: string | ReadableStream<string>) {
    return Deno.writeTextFile(path, data);
  }

  readText(path: string) {
    return Deno.readTextFile(path);
  }

  cwd() {
    return Deno.cwd();
  }
}

export type CommandDescriptor = {
  command: Command;
  name: string;
};

@injectable()
export class FetchCommand implements CommandDescriptor {
  constructor(
    private fs = inject(FileSystem),
    private registry = inject(NodeRegistry)
  ) {}

  name = "fetch";
  command = new Command().action(() => this.#action());

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
      const path = `${manifestDir}/lexicons/${resolution.nsid.segments.join(
        "/"
      )}.json`;

      await ensureFile(path);
      await this.fs.writeText(path, JSON.stringify(resolution.doc, null, 2));
      console.log("wrote ", `${resolution.nsid.segments.join("/")}.json`);
    }
  }
}

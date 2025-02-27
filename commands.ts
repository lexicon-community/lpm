import { inject, injectable } from "@needle-di/core";
import { NodeRegistry } from "./node-registry.ts";
import { NSID } from "@atproto/syntax";
import { ensureFile } from "jsr:@std/fs";

@injectable()
export class FileSystem {
  writeText(path: string, data: string | ReadableStream<string>) {
    return Deno.writeTextFile(path, data);
  }

  readText(path: string) {
    return Deno.readTextFile(path);
  }
}

@injectable()
export class Commands {
  constructor(
    private fs = inject(FileSystem),
    private registry = inject(NodeRegistry)
  ) {}

  async fetch() {
    // TODO: Configure this
    const manifestDir = import.meta.dirname;
    const manifestPath = manifestDir + "/manifest.json";

    const nsids = JSON.parse(await this.fs.readText(manifestPath)).lexicons.map(
      (nsid: string) => NSID.parse(nsid)
    );

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

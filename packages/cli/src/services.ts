import { Effect, Either, Schema } from "effect";
import { FileSystem } from "@effect/platform";
import process from "node:process";
import { NSIDSchema, type Resolution } from "@lpm/core";

const Manifest = Schema.Struct({
  lexicons: Schema.Array(NSIDSchema),
});
export type Manifest = Schema.Schema.Type<typeof Manifest>;
const JSONManifest = Schema.parseJson(Manifest);

export class ManifestService extends Effect.Service<ManifestService>()("cli/ManifestService", {
  effect: Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;

    // TODO: Allow configuring root directory
    const manifestDir = process.cwd();

    const getManifest = Effect.fn("Manifest/getManifest")(function* () {
      const manifestPath = manifestDir + "/lexicons.json";

      const manifestTextEither = yield* fs.readFileString(manifestPath).pipe(Effect.either);
      if (Either.isLeft(manifestTextEither)) {
        return { lexicons: [] };
      }

      const manifestText = manifestTextEither.right;
      return yield* Schema.decodeUnknown(JSONManifest)(manifestText);
    });

    const writeManifest = Effect.fn("Manifest/writeManifest")(function* (manifest: Manifest) {
      const manifestPath = manifestDir + "/lexicons.json";
      const manifestText = yield* Schema.encode(JSONManifest)(manifest);
      yield* fs.writeFileString(manifestPath, manifestText);
    });

    const writeResolution = Effect.fn("Manifest/writeResolution")(function* (resolution: Resolution) {
      const path = `${manifestDir}/lexicons/${resolution.nsid.segments.join("/")}.json`;
      yield* ensureFile(fs, path);
      yield* fs.writeFileString(path, JSON.stringify(resolution.doc, null, 2));
    });

    return {
      getManifest,
      writeManifest,
      writeResolution,
    };
  }),
}) {}

const ensureFile = (fs: FileSystem.FileSystem, path: string) =>
  Effect.gen(function* () {
    if (yield* fs.exists(path)) {
      return;
    }
    const dir = path.substring(0, path.lastIndexOf("/"));
    yield* fs.makeDirectory(dir, { recursive: true });
  });

// class

// const parseJson = (text: string) => Effect.try({
//   try: () => JSON.parse(text),
//   catch: (err) => ,
// })

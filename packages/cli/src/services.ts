import { Effect, Schema } from "effect";
import { FileSystem, Path } from "@effect/platform";
import { NodeFileSystem, NodePath } from "@effect/platform-node";
import process from "node:process";
import { PlatformError, SystemError } from "@effect/platform/Error";

const Manifest = Schema.Struct({
  lexicons: Schema.Array(Schema.String),
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

      return fs.readFileString(manifestPath).pipe(
        Effect.catchTag("SystemError", () => Effect.succeed({ lexicons: [] })),
        Effect.flatMap(Schema.decodeUnknown(JSONManifest)),
      );
    });

    return {
      getManifest,
    };
  }),
}) {}

// class

// const parseJson = (text: string) => Effect.try({
//   try: () => JSON.parse(text),
//   catch: (err) => ,
// })

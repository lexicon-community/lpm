import { Command } from "@effect/cli";
import { Catalog } from "@lpm/core";
import { Effect, Stream } from "effect";
import { ManifestService } from "../services.ts";
import { makeCliError } from "../error.ts";

export const fetchCommand = Command.make("fetch", {}, () =>
  Effect.gen(function* () {
    const manifestService = yield* ManifestService;
    const catalog = yield* Catalog;

    const manifest = yield* manifestService.getManifest();
    const resolutionStream = yield* catalog.resolve(manifest.lexicons);

    yield* resolutionStream.pipe(
      Stream.mapError((error) => {
        if (error._tag === "NoAuthorityError") {
          return makeCliError(`No authority found for NSID ${error.nsid.toString()}`, error);
        }
        return error;
      }),
      Stream.runForEach(manifestService.writeResolution),
    );
  }),
).pipe(Command.withDescription("Fetch and install lexicons from the manifest."));

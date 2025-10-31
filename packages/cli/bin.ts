import { Command } from "@effect/cli";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { Cause, Console, Effect, Exit, Layer } from "effect";
import { viewCommand } from "./src/commands/view.ts";
import pkg from "./package.json" with { type: "json" };
import { fetchCommand } from "./src/commands/fetch.ts";
import { Container } from "@lpm/core";
import { ManifestService } from "./src/services.ts";
import { type Teardown, defaultTeardown } from "@effect/platform/Runtime";
import { CliError } from "./src/error.ts";
import { treeCommand } from "./src/commands/tree.ts";
import { Terminal } from "@effect/platform";
import chalk from "chalk";

const lpm = Command.make("lpm", {}, () => Console.log("lpm cli")).pipe(
  Command.withSubcommands([viewCommand, fetchCommand, treeCommand]),
);

const cli = Command.run(lpm, {
  name: "lpm CLI",
  version: `v${pkg.version}`,
});

const LayerLive = Container.pipe(
  Layer.provideMerge(ManifestService.Default),
  // Must be provided last
  Layer.provideMerge(NodeContext.layer),
);

const teardown: Teardown = (exit, onExit) => {
  // Override exit code for CliError
  if (Exit.isFailure(exit) && Cause.isFailType(exit.cause) && exit.cause.error instanceof CliError) {
    onExit(exit.cause.error.code ?? 1);
    return;
  }

  defaultTeardown(exit, onExit);
};

cli(process.argv).pipe(
  Effect.catchTag("CliError", (error) =>
    Effect.gen(function* () {
      const terminal = yield* Terminal.Terminal;

      yield* terminal.display(`${chalk.white.bgRed("[ERROR]")} ${error.message}`);
    }),
  ),
  Effect.provide(LayerLive),
  NodeRuntime.runMain({
    teardown,
  }),
);

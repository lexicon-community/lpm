import { Command } from "@effect/cli";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { Cause, Console, Effect, Exit, Layer, Logger } from "effect";
import { viewCommand } from "./src/commands/view.ts";
import pkg from "./package.json" with { type: "json" };
import { fetchCommand } from "./src/commands/fetch.ts";
import { Container } from "@lpm/core";
import { ManifestService } from "./src/services.ts";
import { type Teardown, defaultTeardown } from "@effect/platform/Runtime";
import { CliError } from "./src/error.ts";
import chalk from "chalk";

const lpm = Command.make("lpm", {}, () => Console.log("lpm cli")).pipe(
  Command.withSubcommands([viewCommand, fetchCommand]),
);

const cli = Command.run(lpm, {
  name: "lpm CLI",
  version: `v${pkg.version}`,
});

const logger = Logger.make((options) => {
  if (Cause.isFailType(options.cause) && options.cause.error instanceof CliError) {
    console.error(`${chalk.white.bgRed("[ERROR]")} ${options.cause.error.message}`);
  } else {
    Logger.prettyLoggerDefault.log(options);
  }
});

const LoggerLayer = Logger.replace(Logger.defaultLogger, logger);

const LayerLive = Container.pipe(
  Layer.provideMerge(ManifestService.Default),
  // Must be provided last
  Layer.provideMerge(NodeContext.layer),
  Layer.provideMerge(LoggerLayer),
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
  Effect.tapErrorCause((cause) => {
    if (Cause.isInterruptedOnly(cause)) {
      return Effect.void;
    }
    return Effect.logError(cause);
  }),
  Effect.provide(LayerLive),
  NodeRuntime.runMain({
    teardown,
    disablePrettyLogger: true,
    disableErrorReporting: true,
  }),
);

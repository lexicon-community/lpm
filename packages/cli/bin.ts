import { Args, Command } from "@effect/cli";
import { NodeContext, NodeRuntime } from "@effect/platform-node";
import { Console, Effect } from "effect";
import { viewCommand } from "./src/commands/view.ts";
import { Container } from "@lpm/core";
import pkg from "./package.json" with { type: "json" };

const lpm = Command.make("lpm", {}, () => Console.log("lpm cli")).pipe(Command.withSubcommands([viewCommand]));

const cli = Command.run(lpm, {
  name: "lpm CLI",
  version: `v${pkg.version}`,
});

cli(process.argv).pipe(Effect.provide([Container, NodeContext.layer]), NodeRuntime.runMain);

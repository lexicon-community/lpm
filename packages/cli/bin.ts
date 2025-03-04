import {
  AddCommand,
  type CommandDescriptor,
  FetchCommand,
  ViewCommand,
} from "./src/commands.ts";
import { Command } from "@cliffy/command";
import { Container } from "@needle-di/core";
import pkg from "./deno.json" with { type: "json" };

const bin = new Command()
  .name("lpm")
  .version(pkg.version)
  .action(() => {
    console.log(bin.getHelp());
  });

const commands = [FetchCommand, AddCommand, ViewCommand];
const container = new Container();

for (const cmd of commands) {
  // deno-lint-ignore no-explicit-any
  const instance = container.get(cmd as any) as CommandDescriptor;
  bin.command(instance.name, instance.command);
}

await bin.parse(Deno.args);

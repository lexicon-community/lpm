import {
  AddCommand,
  type CommandDescriptor,
  FetchCommand,
} from "./commands.ts";
import { Command } from "@cliffy/command";
import { Container } from "@needle-di/core";

const bin = new Command()
  .name("lpm")
  .version("0.1.0")
  .action(() => {
    console.log(bin.getHelp());
  });

const commands = [FetchCommand, AddCommand];

const container = new Container();

for (const cmd of commands) {
  // deno-lint-ignore no-explicit-any
  const instance = container.get(cmd as any) as CommandDescriptor;
  bin.command(instance.name, instance.command);
}

await bin.parse(Deno.args);

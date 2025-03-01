import {
  AddCommand,
  type CommandDescriptor,
  FetchCommand,
  FileSystem,
} from "./src/commands.ts";
import { Command } from "@cliffy/command";
import { Container } from "@needle-di/core";

const container = new Container();

const pkg = JSON.parse(
  await container.get(FileSystem).readText(import.meta.dirname + "/deno.json")
);

const bin = new Command()
  .name("lpm")
  .version(pkg.version)
  .action(() => {
    console.log(bin.getHelp());
  });

const commands = [FetchCommand, AddCommand];

for (const cmd of commands) {
  // deno-lint-ignore no-explicit-any
  const instance = container.get(cmd as any) as CommandDescriptor;
  bin.command(instance.name, instance.command);
}

await bin.parse(Deno.args);

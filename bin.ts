import { FetchCommand } from "./commands.ts";
import { Command } from "@cliffy/command";
import { Container } from "@needle-di/core";

const bin = new Command()
  .name("lpm")
  .version("0.1.0")
  .action(() => {
    console.log(bin.getHelp());
  });

const commands = [FetchCommand];

const container = new Container();

for (const cmd of commands) {
  const instance = container.get(cmd);
  bin.command(instance.name, instance.command);
}

await bin.parse(Deno.args);

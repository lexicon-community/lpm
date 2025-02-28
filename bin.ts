import { Commands } from "./commands.ts";
import { Command } from "@cliffy/command";
import { bootstrap } from "@needle-di/core";

// await bootstrap(Commands).fetch();

const commands = bootstrap(Commands);

const bin = new Command()
  .name("lpm")
  .version("0.1.0")
  .action(() => {
    console.log(bin.getHelp());
  })
  .command(
    "fetch",
    new Command().action(() => commands.fetch())
  );

await bin.parse(Deno.args);

import { Args, Command } from "@effect/cli";
import { nsidArg } from "../types.ts";
import { Console, Effect } from "effect";
import { SchemaService } from "@lpm/core";
import chalk from "chalk";

export const viewCommand = Command.make(
  "view",
  {
    nsid: nsidArg.pipe(Args.withDescription("The NSID of the lexicon to view.")),
  },
  ({ nsid }) =>
    Effect.gen(function* () {
      const resolveSchema = yield* SchemaService;
      const resolution = yield* resolveSchema(nsid);
      yield* Console.log(`\n${chalk.bold(nsid.toString())}\n`);
      yield* Console.log(`uri: ${chalk.yellow(resolution.uri.toString())}`);

      const url = new URL("/xrpc/com.atproto.repo.getRecord", resolution.pds);
      url.searchParams.set("repo", resolution.uri.host);
      url.searchParams.set("collection", resolution.uri.collection);
      url.searchParams.set("rkey", resolution.uri.rkey);
      yield* Console.log(`record url: ${chalk.yellow(url.toString())}`);

      yield* Console.log(
        `\ndependencies:\n${resolution.children.map((nsid) => `- ${chalk.bold(nsid.toString())}`).join("\n")}`,
      );
    }),
).pipe(Command.withDescription("View a lexicon."));

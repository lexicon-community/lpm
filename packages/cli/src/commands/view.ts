import { Args, Command } from "@effect/cli";
import { nsidArg } from "../types.ts";
import { Effect } from "effect";
import { SchemaService } from "@lpm/core";
import chalk from "chalk";
import { Terminal } from "@effect/platform";

export const viewCommand = Command.make(
  "view",
  {
    nsid: nsidArg.pipe(Args.withDescription("The NSID of the lexicon to view.")),
  },
  ({ nsid }) =>
    Effect.gen(function* () {
      const resolveSchema = yield* SchemaService;
      const terminal = yield* Terminal.Terminal;

      const resolution = yield* resolveSchema(nsid);
      yield* terminal.display(`\n[${chalk.bold.underline(nsid.toString())}]\n\n`);
      yield* terminal.display(`${chalk.bold("uri")}: ${chalk.yellow(resolution.uri.toString())}\n`);

      const url = new URL("/xrpc/com.atproto.repo.getRecord", resolution.pds);
      url.searchParams.set("repo", resolution.uri.host);
      url.searchParams.set("collection", resolution.uri.collection);
      url.searchParams.set("rkey", resolution.uri.rkey);
      yield* terminal.display(`${chalk.bold("record url")}: ${chalk.yellow(url.toString())}\n\n`);

      yield* terminal.display(
        `${chalk.bold.underline("dependencies")}:\n${resolution.children.map((nsid) => `- ${nsid}`).join("\n")}`,
      );
    }),
).pipe(Command.withDescription("View a lexicon."));

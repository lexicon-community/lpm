import { bootstrap } from "@needle-di/core";
import { Commands } from "./commands.ts";

await bootstrap(Commands).fetch();

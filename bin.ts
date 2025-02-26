import { Commands } from "./commands.ts";
import { globalContainer } from "./container.ts";

await globalContainer.get(Commands).fetch();

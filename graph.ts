import { createGraph } from "jsr:@deno/graph";

const graph = await createGraph(import.meta.dirname + "./bin.ts");

console.log(JSON.stringify(graph, undefined, "  "));

import { Effect } from "effect";
import { type ContainerRequirement, Container } from "../src/container.ts";
import test from "node:test";

export async function testEffect(name: string, effect: Effect.Effect<unknown, unknown, ContainerRequirement>) {
  await test(name, async () => {
    await Effect.runPromise(Effect.provide(effect, Container));
  });
}

testEffect.only = async (name: string, effect: Effect.Effect<unknown, unknown, ContainerRequirement>) => {
  await test.only(name, async () => {
    await Effect.runPromise(Effect.provide(effect, Container));
  });
};

import { Effect } from "effect";
import { type ContainerRequirement, Container } from "../src/container.ts";
import test from "node:test";

export async function testEffect(name: string, effect: Effect.Effect<unknown, unknown, never>) {
  await test(name, async () => {
    await Effect.runPromise(effect);
  });
}

testEffect.only = async (name: string, effect: Effect.Effect<unknown, unknown, never>) => {
  await test.only(name, async () => {
    await Effect.runPromise(effect);
  });
};

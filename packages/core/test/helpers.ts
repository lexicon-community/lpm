import { Effect } from "effect";
import test from "node:test";
import { DevTools } from "@effect/experimental";

export async function testEffect(name: string, effect: Effect.Effect<unknown, unknown, never>) {
  await test(name, runEffectForTest(effect));
}

testEffect.only = async (name: string, effect: Effect.Effect<unknown, unknown, never>) =>
  test.only(name, runEffectForTest(effect));

const runEffectForTest = (effect: Effect.Effect<unknown, unknown, never>) => async () => {
  await Effect.runPromise(effect.pipe(Effect.provide(DevTools.layer())));
};

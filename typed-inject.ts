// deno-lint-ignore-file no-explicit-any
import { Container, Provider, Token } from "@needle-di/core";

type InferToken<P extends Provider<any> = Provider<any>> = P extends Provider<
  infer T
>
  ? Token<T>
  : never;

type InferTokens<P extends Provider<any>[]> = {
  [K in keyof P]: InferToken<P[K]>;
};

class TypedContainer<Tokens extends Token<any>[]> {
  constructor(public inner: Container) {}

  get<T extends Tokens[number]>(
    token: T
  ): T extends Token<infer U> ? U : never {
    return this.inner.get(token);
  }

  bind(p: Provider<unknown>) {
    this.inner.bind(p);
  }

  createChild(): TypedContainer<Tokens> {
    return new TypedContainer(this.inner.createChild());
  }
}

export function createContainer<Providers extends Provider<any>[]>(
  providers: [...Providers]
): TypedContainer<InferTokens<Providers>> {
  const container = new Container();

  return new TypedContainer(
    container.bindAll(
      // @ts-expect-error Valid spread
      ...providers
    )
  );
}

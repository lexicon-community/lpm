import { DidResolver as AtprotoDidResolver, DidNotFoundError as AtprotoDidNotFoundError } from "@atproto/identity";
import { DnsService } from "./dns.ts";
import { Data, Effect } from "effect";
import { NSIDPattern } from "./nsid-pattern.ts";
import { NSID } from "./nsid.ts";

export class DidNotFoundError extends Data.TaggedError("DidNotFoundError")<{
  cause: AtprotoDidNotFoundError;
}> {}

export class UnknownError extends Data.TaggedError("UnknownError")<{
  cause: unknown;
}> {}

export class DidResolver extends Effect.Service<DidResolver>()("core/DidResolver", {
  sync: () => {
    const resolver = new AtprotoDidResolver({});

    return {
      resolveAtprotoData: (did: string) =>
        Effect.tryPromise({
          try: () => resolver.resolveAtprotoData(did),
          catch: (err) => {
            if (err instanceof AtprotoDidNotFoundError) {
              return new DidNotFoundError({ cause: err });
            }

            return new UnknownError({ cause: err });
          },
        }),
    };
  },
}) {}

const nsidAuthorityServiceImpl = Effect.gen(function* () {
  const dnsService = yield* DnsService;
  const didResolver = yield* DidResolver;

  return {
    resolve: (nsidOrPattern: NSID | NSIDPattern) =>
      Effect.gen(function* () {
        {
          const nsid =
            nsidOrPattern instanceof NSIDPattern
              ? NSID.create(nsidOrPattern.base.segments.slice().reverse().join("."), "dummy")
              : nsidOrPattern;

          const record = yield* dnsService
            .resolveTxt(`_lexicon.${nsid.authority}`)
            .pipe(Effect.catchAll(() => Effect.succeed(null)));

          if (!record) {
            return null;
          }

          const authorityDid = record.join("").replace(/^did=/, "");

          try {
            return yield* didResolver.resolveAtprotoData(authorityDid);
          } catch (err) {
            if (err instanceof DidNotFoundError) {
              return null;
            }

            throw err;
          }
        }
      }),
  };
});

export class NSIDAuthorityService extends Effect.Service<NSIDAuthorityService>()("core/NSIDAuthorityService", {
  effect: nsidAuthorityServiceImpl,
}) {}

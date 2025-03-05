import { inject, injectable, InjectionToken } from "@needle-di/core";
import { NSID } from "@atproto/syntax";
import {
  type AtprotoData,
  DidNotFoundError,
  DidResolver,
} from "@atproto/identity";
import { DnsService } from "./dns.ts";
import { NSIDPattern } from "./nsid-pattern.ts";

const DidResolverToken = new InjectionToken(Symbol("DidResolver"), {
  factory: () => new DidResolver({}),
});

@injectable()
export class NSIDAuthorityService {
  constructor(
    private dnsServicer: DnsService = inject(DnsService),
    private didResolver: DidResolver = inject(DidResolverToken),
  ) {}

  async resolve(
    nsidOrPattern: NSID | NSIDPattern,
  ): Promise<AtprotoData | null> {
    const nsid = nsidOrPattern instanceof NSIDPattern
      ? NSID.create(
        nsidOrPattern.base.segments.slice().reverse().join("."),
        "dummy",
      )
      : nsidOrPattern;

    let record;
    try {
      record = await this.dnsServicer.resolveTxt(
        `_lexicon.${nsid.authority}`,
      );
    } catch (_) {
      return null;
    }

    const authorityDid = record.join("").replace(/^did=/, "");

    try {
      return this.didResolver.resolveAtprotoData(authorityDid);
    } catch (err) {
      if (err instanceof DidNotFoundError) {
        return null;
      }

      throw err;
    }
  }
}

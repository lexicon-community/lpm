import { Effect } from "effect";
import { resolveTxt } from "node:dns/promises";

export class DnsService extends Effect.Service<DnsService>()("core/DnsService", {
  sync: () => ({
    resolveTxt: (domain: string) => Effect.tryPromise(() => resolveTxt(domain)),
  }),
}) {}

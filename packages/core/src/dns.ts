import { injectable } from "@needle-di/core";
import dns from "node:dns/promises";

@injectable()
export class DnsService {
  resolveTxt(domain: string): Promise<string[][]> {
    return dns.resolveTxt(domain);
  }
}

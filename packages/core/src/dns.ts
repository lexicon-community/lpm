import { injectable } from "@needle-di/core";
import { resolveTxt } from "node:dns/promises";

@injectable()
export class DnsService {
  async resolveTxt(domain: string): Promise<string[][]> {
    try {
      return await resolveTxt(domain);
    } catch (error) {
      throw new Error(`Failed to resolve TXT record for ${domain}.`, {
        cause: error,
      });
    }
  }
}

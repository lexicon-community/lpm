import { injectable } from "@needle-di/core";

@injectable()
export class DnsService {
  async resolveTxt(domain: string): Promise<string[][]> {
    try {
      return await Deno.resolveDns(domain, "TXT");
    } catch (error) {
      throw new Error(`Failed to resolve TXT record for ${domain}.`, {
        cause: error,
      });
    }
  }
}

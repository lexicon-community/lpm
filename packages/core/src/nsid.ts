import { isValidNsid, parseNsid, NSID as ATNSID } from "@atproto/syntax";
import { Data, Effect } from "effect";

class NSIDParseError extends Data.TaggedError("NSIDParseError")<{
  cause: Error;
}> {}

export class NSID extends Data.Class<{ segments: readonly string[] }> {
  static parse(input: string) {
    return Effect.try({
      try: () => new NSID({ segments: parseNsid(input) }),
      catch: (err) =>
        new NSIDParseError({
          cause: err instanceof Error ? err : new Error("Unknown parse error"),
        }),
    });
  }

  static create(authority: string, name: string) {
    const input = [...authority.split(".").reverse(), name].join(".");
    return new ATNSID(input);
  }

  static isValid(input: string): boolean {
    return isValidNsid(input);
  }

  get authority() {
    return this.segments
      .slice(0, this.segments.length - 1)
      .reverse()
      .join(".");
  }

  get name() {
    return this.segments.at(this.segments.length - 1);
  }

  toString() {
    return this.segments.join(".");
  }
}

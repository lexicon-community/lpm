import { isValidNsid, parseNsid, NSID as ATNSID } from "@atproto/syntax";
import { Data, Effect, Equal, Hash, ParseResult, Schema } from "effect";

export class NSIDParseError extends Data.TaggedError("NSIDParseError")<{
  cause: Error;
}> {}

const NSIDFromSelf = Schema.declare((input: unknown): input is NSID => input instanceof NSID);

export const NSIDSchema = Schema.transformOrFail(Schema.String, NSIDFromSelf, {
  strict: true,
  encode: (nsid) => ParseResult.succeed(nsid.toString()),
  decode: (input, _options, ast) =>
    NSID.parse(input).pipe(Effect.mapError(() => new ParseResult.Type(ast, input, `Invalid NSID: "${input}"`))),
});

export class NSID implements Equal.Equal {
  readonly segments: readonly string[];

  constructor(input: { readonly segments: readonly string[] }) {
    this.segments = input.segments;
  }

  [Equal.symbol](that: Equal.Equal): boolean {
    if (!(that instanceof NSID)) return false;
    return this.segments.length === that.segments.length && this.segments.every((seg, i) => seg === that.segments[i]);
  }

  [Hash.symbol](): number {
    return Hash.hash(this.toString());
  }

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

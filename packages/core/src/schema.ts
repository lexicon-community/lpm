import { AtUri } from "@atproto/syntax";
import { type LexArray, type LexiconDoc, lexiconDoc, type LexObject, type LexRefVariant } from "@atproto/lexicon";
import { NSIDAuthorityService } from "./nsid-authority.ts";
import { createAtprotoClient } from "./atproto-client.ts";
import { FetchService } from "./fetch.ts";
import { Data, Effect } from "effect";
import { NSID } from "./nsid.ts";

export class NoAuthorityError extends Data.TaggedError("NoAuthorityError")<{
  nsid: NSID;
}> {}

export class AuthorityInvalidError extends Data.TaggedError("AuthorityInvalidError")<{
  nsid: NSID;
}> {}

export class RecordNotFoundError extends Data.TaggedError("RecordNotFoundError")<{
  nsid: NSID;
}> {}

export class CidNotFoundError extends Data.TaggedError("CidNotFoundError")<{
  nsid: NSID;
}> {}

export type ResolutionError = NoAuthorityError | AuthorityInvalidError | RecordNotFoundError | CidNotFoundError;

export type Resolution = {
  uri: AtUri;
  doc: LexiconDoc;
  children: NSID[];
  nsid: NSID;
  cid: string;
  unresolvedRefs: string[];
  pds: string;
};

export class SchemaService extends Effect.Service<SchemaService>()("core/SchemaService", {
  effect: Effect.gen(function* () {
    const fetch = yield* FetchService;
    const nsidAuthorityService = yield* NSIDAuthorityService;

    return Effect.fn("resolveSchema")(function* (nsid: NSID) {
      yield* Effect.annotateCurrentSpan("nsid", nsid.toString());
      const authority = yield* nsidAuthorityService.resolve(nsid);
      if (!authority) {
        return yield* Effect.fail(new NoAuthorityError({ nsid }));
      }

      const uri = AtUri.make(authority.did, "com.atproto.lexicon.schema", nsid.toString());

      const client = createAtprotoClient(authority.pds, fetch);

      const schemaRecordResponse = yield* Effect.tryPromise(() =>
        client.com.atproto.repo.getRecord({
          repo: authority.did,
          collection: "com.atproto.lexicon.schema",
          rkey: nsid.toString(),
        }),
      );

      // This fixes an issue with the lexiconDoc schema not expecting the $type field
      delete schemaRecordResponse.data.value.$type;

      const doc = lexiconDoc.parse(schemaRecordResponse.data.value);

      if (schemaRecordResponse.data.cid === undefined) {
        return yield* Effect.fail(new CidNotFoundError({ nsid }));
      }

      const refs = getRefs(doc);

      const externalRefs = [
        ...new Set(
          refs
            .filter((ref) => !ref.startsWith("#") && ref.split("#")[0] !== nsid.toString())
            .map((ref) => ref.split("#")[0]!),
        ),
      ];

      const childNsids = [];
      const unresolvedRefs = [];

      for (const ref of externalRefs) {
        if (NSID.isValid(ref)) {
          childNsids.push(yield* NSID.parse(ref));
        } else {
          unresolvedRefs.push(ref);
        }
      }

      if (unresolvedRefs.length > 0) {
        console.warn(`Unresolved refs: ${unresolvedRefs.join(", ")}`);
      }

      return {
        uri: uri,
        children: childNsids,
        doc,
        nsid,
        cid: schemaRecordResponse.data.cid,
        unresolvedRefs,
        pds: authority.pds,
      } as Resolution;
    });
  }),
}) {}

function getRefs(doc: LexiconDoc): string[] {
  const refs: (LexRefVariant | string)[] = [];

  for (const def of Object.values(doc.defs)) {
    switch (def.type) {
      case "array":
        refs.push(...getArrayRefs(def));
        break;

      case "object":
        refs.push(...getObjectRefs(def));
        break;

      case "record":
        refs.push(...getObjectRefs(def.record));
        break;

      case "subscription":
      case "procedure":
      case "query": {
        const schema = def.type === "subscription" ? def.message?.schema : def.output?.schema;
        switch (schema?.type) {
          case undefined:
            break;

          case "object":
            refs.push(...getObjectRefs(schema));
            break;

          case "ref":
            refs.push(schema);
            break;

          case "union":
            refs.push(schema);
            break;

          default:
            throw new Error(
              `Unexpected ${def.type} output.schema type: ${
                // @ts-expect-error exhaustative check
                schema?.type
              }`,
            );
        }
        break;
      }

      case "string":
      case "token":
      case "blob":
      case "boolean":
      case "bytes":
      case "cid-link":
      case "integer":
      case "unknown":
        break;

      default:
        throw new Error(`Unexpected def type: ${def.type}`);
    }
  }

  return [
    ...new Set(refs.flatMap((ref) => (typeof ref === "string" ? [ref] : ref.type === "ref" ? [ref.ref] : ref.refs))),
  ];
}

function getArrayRefs(arr: LexArray): LexRefVariant[] {
  if (arr.items.type === "ref") {
    return [arr.items];
  } else if (arr.items.type === "union") {
    return [arr.items];
  }

  return [];
}

function getObjectRefs(obj: LexObject): LexRefVariant[] {
  return Object.values(obj.properties).flatMap((prop) => {
    if (prop.type === "ref") return prop;

    if (prop.type === "array") return getArrayRefs(prop);

    if (prop.type === "union") return prop;

    return [];
  });
}

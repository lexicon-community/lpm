import { AtUri, NSID } from "@atproto/syntax";
import {
  LexArray,
  lexiconDoc,
  LexiconDoc,
  LexObject,
  LexRefVariant,
} from "@atproto/lexicon";
import { AtpBaseClient } from "@atproto/api";
import { DidResolver } from "@atproto/identity";
import { NodeRegistry } from "./node-registry.ts";

export type Resolution =
  | {
      success: true;
      uri: AtUri;
      doc: LexiconDoc;
      children: Node[];
      nsid: NSID;
      cid: string;
      unresolvedRefs: string[];
    }
  | {
      success: false;
      errorCode: "NO_AUTHORITY" | "AUTHORITY_INVALID" | "RECORD_NOT_FOUND";
    };

export class Node {
  #data: null | Promise<Resolution> = null;

  constructor(
    public readonly nsid: NSID,
    private registry: NodeRegistry,
    private fetch: typeof globalThis.fetch,
    private resolveDns: typeof Deno.resolveDns,
    private didResolver: DidResolver
  ) {}

  async #internalResolve(): Promise<Resolution> {
    const record = await this.resolveDns(
      `_lexicon.${this.nsid.authority}`,
      "TXT"
    );

    const authorityDid = record.join("").replace(/^did=/, "");
    const uri = AtUri.make(
      authorityDid,
      "com.atproto.lexicon.schema",
      this.nsid.toString()
    );

    const pds = (await this.didResolver.resolveAtprotoData(authorityDid)).pds;

    const client = new AtpBaseClient((input, init) =>
      this.fetch(new URL(input, pds), init)
    );

    const schemaRecordResponse = await client.com.atproto.repo.getRecord({
      repo: authorityDid,
      collection: "com.atproto.lexicon.schema",
      rkey: this.nsid.toString(),
    });

    // This fixes an issue with the lexiconDoc schema not expecting the $type field
    delete schemaRecordResponse.data.value.$type;

    const doc = lexiconDoc.parse(schemaRecordResponse.data.value);

    if (schemaRecordResponse.data.cid === undefined) {
      throw new Error("Expected cid to be defined");
    }

    const childNsids = [];
    const unresolvedRefs = [];
    for (const ref of getRefs(doc)) {
      // Filter out internal references
      if (ref.startsWith("#") || ref.split("#")[0] === this.nsid.toString()) {
        continue;
      }

      if (NSID.isValid(ref)) {
        childNsids.push(NSID.parse(ref));
      } else {
        unresolvedRefs.push(ref);
      }
    }

    return {
      success: true,
      uri: uri,
      children: childNsids.map((nsid) => this.registry.get(nsid)),
      doc,
      nsid: this.nsid,
      cid: schemaRecordResponse.data.cid,
      unresolvedRefs,
    };
  }

  resolve(): Promise<Resolution> {
    if (this.#data) {
      return this.#data;
    }

    return (this.#data = this.#internalResolve());
  }
}

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
        const schema =
          def.type === "subscription"
            ? def.message?.schema
            : def.output?.schema;
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
              }`
            );
        }
        break;
      }

      case "string":
        if (def.knownValues) {
          refs.push(...def.knownValues);
        }
        break;

      case "token":
      case "blob":
      case "boolean":
      case "bytes":
      case "cid-link":
      case "integer":
      case "unknown":
        break;

      default:
        throw new Error(
          `Unexpected def type: ${
            // @ts-expect-error Exhaustative check
            def.type
          }`
        );
    }
  }

  return [
    ...new Set(
      refs.flatMap((ref) =>
        typeof ref === "string"
          ? [ref]
          : ref.type === "ref"
          ? [ref.ref.split("#")[0]!]
          : ref.refs.map((ref) => ref.split("#")[0]!)
      )
    ),
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

    return [];
  });
}

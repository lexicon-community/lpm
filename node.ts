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

    delete schemaRecordResponse.data.value.$type;

    const doc = lexiconDoc.parse(schemaRecordResponse.data.value);

    const refs = getExternalRefs(this.nsid, doc);
    console.log(refs);
    // TODO: Better presentation of errors. Maybe just ignore?
    const childNsids = refs.map((ref) => NSID.parse(ref));

    return {
      success: true,
      uri: uri,
      children: childNsids.map((nsid) => this.registry.get(nsid)),
      doc,
      nsid: this.nsid,
    };
  }

  resolve(): Promise<Resolution> {
    if (this.#data) {
      return this.#data;
    }

    return (this.#data = this.#internalResolve());
  }
}

function getExternalRefs(nsid: NSID, doc: LexiconDoc): string[] {
  const refs: (LexRefVariant | string)[] = [];

  for (const def of Object.values(doc.defs)) {
    // console.log(def);
    switch (def.type) {
      case "array":
        refs.push(...getArrayRefs(def));
        break;

      case "object":
        refs.push(...getObjectRefs(def));
        break;

      case "record":
        refs.push(
          ...Object.values(def.record.properties).filter(
            (prop) => prop.type === "ref"
          )
        );
        break;

      case "query":
        switch (def.output?.schema?.type) {
          case "object":
            refs.push(...getObjectRefs(def.output.schema));
            break;

          case "ref":
            refs.push(def.output.schema);
            break;

          case "union":
            refs.push(def.output?.schema);
            break;

          case undefined:
            break;

          default:
            throw new Error(
              `Unexpected query output.schema type: ${
                // @ts-expect-error exhaustative check
                def.output?.schema?.type
              }`
            );
        }
        break;

      case "string":
        if (def.knownValues) {
          refs.push(...def.knownValues);
        }
        break;

      default:
        console.warn(`Unexpected def type: ${def.type}`);
    }
  }

  return [
    ...new Set(
      refs.flatMap((ref) =>
        typeof ref === "string"
          ? isExternalRef(nsid, ref)
            ? [ref]
            : []
          : ref.type === "ref"
          ? isExternalRef(nsid, ref.ref)
            ? [ref.ref.split("#")[0]!]
            : []
          : ref.refs
              .filter((ref) => isExternalRef(nsid, ref))
              .map((ref) => ref.split("#")[0]!)
      )
    ),
  ];
}

function getArrayRefs(arr: LexArray) {
  return arr.items.type === "ref" ? [arr.items] : [];
}

function getObjectRefs(obj: LexObject) {
  return Object.values(obj.properties).flatMap((prop) => {
    if (prop.type === "ref") return prop;

    if (prop.type === "array") return getArrayRefs(prop);

    return [];
  });
}

function isExternalRef(nsid: NSID, ref: string): boolean {
  console.log(
    ref,
    nsid.toString(),
    !ref.startsWith("#"),
    ref.split("#")[0] !== nsid.toString(),
    ref.split("#")[0]
  );
  return !ref.startsWith("#") || ref.split("#")[0] !== nsid.toString();
}

// import type { ArgumentValue } from "@cliffy/command";
// import { NSIDPattern } from "@lpm/core";
// import { NSID } from "@atproto/syntax";

import { NSID } from "@atproto/syntax";
import { Args, HelpDoc } from "@effect/cli";

// export function nsidOrPattern(
//   { label, name, value }: ArgumentValue,
// ): NSID | NSIDPattern {
//   if (!NSID.isValid(value)) {
//     try {
//       return new NSIDPattern(value);
//     } catch (_) {
//       throw new Error(
//         `${label} "${name}" must be a valid NSID or NSIDPattern, but got "${value}"`,
//       );
//     }
//   }

//   return NSID.parse(value);
// }

// export function nsid(
//   { label, name, value }: ArgumentValue,
// ): NSID {
//   if (!NSID.isValid(value)) {
//     throw new Error(
//       `${label} "${name}" must be a valid NSID, but got "${value}"`,
//     );
//   }

//   return NSID.parse(value);
// }

export const nsidArg = Args.text({ name: "nsid" }).pipe(
  Args.mapTryCatch(
    (value) => NSID.parse(value),
    () => HelpDoc.p("The provided value is not a valid NSID."),
  ),
  Args.withDescription("A valid lexicon NSID."),
);

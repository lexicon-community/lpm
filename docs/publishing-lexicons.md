# Publishing Lexicons with `lpm publish`

This document outlines the design and implementation strategy for a new CLI command, `lpm publish`, intended to facilitate the publishing of lexicon schema definitions to an AT Protocol Personal Data Server (PDS).

## Command Syntax

The proposed command syntax is:

```bash
lpm publish <nsidPattern> <lexiconPath> --handle <handle> --app-password <password> [--pds-url <url>] [--yes]
```

*   `<nsidPattern>`: An NSID pattern (e.g., `com.example.*`) specifying the namespace the lexicons belong to. The command will verify that the NSIDs within the JSON files match this pattern.
*   `<lexiconPath>`: The local directory path containing the lexicon definition JSON files (one file per lexicon).
*   `--handle <handle>`: The user's AT Protocol handle (e.g., `alice.bsky.social`). Required.
*   `--app-password <password>`: An app password generated for the user's account. Required.
*   `--pds-url <url>`: (Optional) The URL of the PDS to publish to. If omitted, it will be resolved from the user's handle.
*   `--yes`: (Optional) Skip the confirmation prompt before publishing.

## Core Functionality & Workflow

The `lpm publish` command will perform the following steps:

1.  **Parse Arguments:** Validate and parse the command-line arguments and options.
2.  **Resolve Handle & PDS:**
    *   Resolve the provided `--handle` to the user's DID (`userDid`) using `com.atproto.identity.resolveHandle`.
    *   Determine the target PDS URL: use `--pds-url` if provided, otherwise use the PDS endpoint found in the resolved handle's DID document.
3.  **Authenticate:**
    *   Establish a session with the target PDS using `com.atproto.server.createSession` with the handle and app password.
    *   Create an authenticated AT Protocol client instance configured with the session's access token and the target PDS URL.
4.  **Resolve Domain Authority:**
    *   Extract the domain from the `<nsidPattern>` (e.g., `com.example.*` -> `example.com`).
    *   Use the `NSIDAuthorityService` (or similar logic) to resolve the authority for this domain (via DNS TXT lookup for `_atproto.example.com` and subsequent DID resolution if needed) to get the expected authoritative DID (`authorityDid`).
5.  **Verify Authority Match:**
    *   Compare the `userDid` (resolved from the handle) with the `authorityDid` (resolved from the domain).
    *   If they do not match, abort the process with an error. This ensures the user attempting to publish controls the DID that is authoritative for the lexicon's namespace domain.
6.  **Read & Validate Local Lexicons:**
    *   Scan the `<lexiconPath>` directory for `.json` files.
    *   For each file:
        *   Read the JSON content.
        *   Parse the JSON.
        *   Validate the content against the official Lexicon schema using `@atproto/lexicon`'s `lexiconDoc.parse()`. Report errors for invalid files.
        *   Extract the `id` (NSID) from the parsed `LexiconDoc`.
        *   Verify that the extracted NSID matches the provided `<nsidPattern>`. Report errors for non-matching NSIDs.
        *   Store the validated `LexiconDoc` and its corresponding NSID.
7.  **Prepare Records:**
    *   Create a list of records to be published using the `com.atproto.repo.putRecord` operation. Each record requires:
        *   `repo`: The `userDid`.
        *   `collection`: `com.atproto.lexicon.schema`.
        *   `rkey`: The NSID string from the lexicon document's `id`.
        *   `record`: The validated `LexiconDoc` object.
8.  **User Confirmation:**
    *   Display a summary to the user:
        *   Target PDS URL.
        *   Target Repository (User's DID).
        *   List of Lexicon NSIDs (rkeys) that will be created or updated.
    *   Unless the `--yes` flag was provided, prompt the user for confirmation (e.g., "Proceed with publishing? (y/N)"). If confirmation is denied, abort.
9.  **Publish to PDS:**
    *   Iterate through the prepared list of records.
    *   For each record, execute a `com.atproto.repo.putRecord` XRPC call using the authenticated client.
    *   Log the success (including the returned URI and CID) or failure for each lexicon publication attempt.

## Implementation Details

*   **New Command:** Create a `PublishCommand` class in `packages/cli/src/commands.ts`.
*   **Dependencies:** Inject `FileSystem`, `NSIDAuthorityService`, `DidResolverToken`, and potentially a new service/factory for managing authenticated AT Protocol client instances.
*   **CLI Integration:** Register `PublishCommand` in `packages/cli/bin.ts`. Add necessary argument/option types (like `nsidPattern`) to `packages/cli/src/types.ts`.
*   **Authentication:** Use `@atproto/api` or a similar library capable of handling `createSession` and authenticated XRPC calls. Securely handle the app password.
*   **Lexicon Validation:** Utilize the `lexiconDoc.parse()` function from `@atproto/lexicon`.
*   **File System Interaction:** Use the existing `FileSystem` abstraction for reading directories and files.
*   **Error Handling:** Implement comprehensive error handling for file I/O, network requests (DNS, DID resolution, PDS XRPC calls), authentication failures, validation errors, and authority mismatches. Provide clear, user-friendly error messages.
*   **XRPC Calls:** Use `com.atproto.identity.resolveHandle`, `com.atproto.server.createSession`, and `com.atproto.repo.putRecord`.

## Future Considerations

*   **Update vs. Create:** `putRecord` handles both creation and updates. Consider adding checks or flags to differentiate behavior if needed.
*   **Deleting Lexicons:** A separate `lpm unpublish` or `lpm delete` command might be needed.
*   **Dry Run Mode:** Add a `--dry-run` flag to perform all checks and validations without actually publishing to the PDS.
*   **Batching:** For a large number of lexicons, consider batching PDS requests if the API supports it (e.g., `com.atproto.repo.applyWrites`), although `putRecord` per lexicon is simpler initially.

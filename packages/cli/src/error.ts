import { Data } from "effect";

/**
 * Represents an expected error that occurs within the CLI application.
 *
 * When this error is caught by the cli runner, it will display the error message only with the default log level and exit with code 1 (or the provided code).
 *
 * This is useful for errors that are anticipated and do not require a full stack trace to be shown to the user.
 */
export class CliError extends Data.TaggedError("CliError")<{ message: string; cause: unknown; code?: number }> {}

export function makeCliError(message: string, cause: unknown, code?: number): CliError {
  return new CliError({ message, cause, code });
}

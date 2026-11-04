type ClientErrorOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

/**
 * Reports a client-side error. By default this just logs to the console;
 * wire in an error-monitoring provider here if/when you add one.
 */
export function reportError(
  error: unknown,
  context: Record<string, unknown> = {},
  options: ClientErrorOptions = {},
) {
  if (typeof window === "undefined") return;
  console.error(error, { ...context, ...options });
}

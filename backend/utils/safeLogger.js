const SAFE_OUTCOMES = new Set([
  "found",
  "memory_fallback",
  "not_found",
  "partial",
  "primary",
  "retry",
  "success",
]);

const safeContextValue = (key, value) => {
  if (["count", "port", "statusCode"].includes(key)) {
    return Number.isFinite(value) ? value : undefined;
  }

  if (key === "method") {
    return typeof value === "string" && /^[A-Z]{3,10}$/.test(value)
      ? value
      : undefined;
  }

  if (key === "outcome") {
    return SAFE_OUTCOMES.has(value) ? value : undefined;
  }

  if (key === "provider") {
    return value === "sandbox" || value === "gmail" ? value : "custom";
  }

  if (key === "route") {
    return typeof value === "string" && /^[A-Za-z0-9_/:.-]{1,160}$/.test(value)
      ? value
      : "unknown_route";
  }

  return undefined;
};

const safeContext = (context = {}) =>
  Object.fromEntries(
    Object.entries(context)
      .map(([key, value]) => [key, safeContextValue(key, value)])
      .filter(([, value]) => value !== undefined),
  );

const safeEvent = (event) =>
  typeof event === "string" && /^[a-z][a-z0-9_]{2,80}$/.test(event)
    ? event
    : "application_event";

const safeErrorType = (error) => {
  const name = error?.name;
  return typeof name === "string" && /^[A-Za-z][A-Za-z0-9]*Error$/.test(name)
    ? name
    : "Error";
};

const safeDevelopmentStack = (error) => {
  const enabled =
    process.env.NODE_ENV === "development" &&
    process.env.ENABLE_SAFE_STACK_LOGS === "true";

  if (!enabled || typeof error?.stack !== "string") return undefined;

  // Exclude the first line because it contains the error message, which may
  // include request data or credentials. JavaScript stack frames contain only
  // code locations and are emitted solely through an explicit development opt-in.
  const frames = error.stack
    .split("\n")
    .slice(1)
    .filter((line) => /^\s*at\s/.test(line))
    .slice(0, 20)
    .join("\n");

  return frames || undefined;
};

export const logSafeEvent = (event, context = {}) => {
  console.log("[AppEvent]", {
    event: safeEvent(event),
    ...safeContext(context),
  });
};

export const logSafeError = (event, error, context = {}) => {
  const entry = {
    event: safeEvent(event),
    ...safeContext(context),
    errorType: safeErrorType(error),
  };

  const stack = safeDevelopmentStack(error);
  if (stack) entry.stack = stack;

  console.error("[AppError]", entry);
};

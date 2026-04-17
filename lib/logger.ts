type LogLevel = "info" | "warn" | "error";

function serializeContext(context?: Record<string, unknown>) {
  if (!context) {
    return undefined;
  }

  const sensitiveKeyPattern = /(key|secret|token|password|cookie|authorization)/i;
  const entries = Object.entries(context).map(([key, value]) => {
    if (sensitiveKeyPattern.test(key)) {
      return [key, "[redacted]"];
    }

    if (typeof value === "string" && value.length > 300) {
      return [key, `${value.slice(0, 300)}...`];
    }

    return [key, value];
  });

  return Object.fromEntries(entries);
}

export function logEvent(level: LogLevel, message: string, context?: Record<string, unknown>) {
  const payload = {
    level,
    message,
    context: serializeContext(context),
    timestamp: new Date().toISOString(),
  };

  const line = JSON.stringify(payload);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.info(line);
}

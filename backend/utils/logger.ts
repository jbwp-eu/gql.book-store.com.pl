type LogFields = Record<string, string | number | boolean | undefined | null>;

function formatMessage(
  level: string,
  message: string,
  requestId?: string,
  fields?: LogFields
): string {
  const parts = [level];
  if (requestId) parts.push(`req=${requestId}`);
  parts.push(message);
  if (fields && Object.keys(fields).length > 0) {
    parts.push(JSON.stringify(fields));
  }
  return parts.join(" ");
}

export const logger = {
  info(message: string, fields?: LogFields, requestId?: string): void {
    console.log(formatMessage("INFO", message, requestId, fields));
  },
  warn(message: string, fields?: LogFields, requestId?: string): void {
    console.warn(formatMessage("WARN", message, requestId, fields));
  },
  error(
    message: string,
    err?: unknown,
    fields?: LogFields,
    requestId?: string
  ): void {
    const errMsg =
      err instanceof Error ? err.message : err != null ? String(err) : "";
    const merged: LogFields = { ...(fields ?? {}) };
    if (errMsg) merged.error = errMsg;
    console.error(formatMessage("ERROR", message, requestId, merged));
  },
};

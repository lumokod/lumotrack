/**
 * True when a database error is a Postgres unique-constraint violation
 * (SQLSTATE 23505). Drizzle wraps driver errors in `DrizzleQueryError`, so the
 * code can live on the error itself or on its `cause`.
 */
export function isUniqueViolation(error: unknown): boolean {
  const code =
    (error as { code?: unknown })?.code ??
    (error as { cause?: { code?: unknown } })?.cause?.code;
  return code === "23505";
}

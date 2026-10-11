/** Result shape returned by every Server Action, safe to import on the client. */
export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

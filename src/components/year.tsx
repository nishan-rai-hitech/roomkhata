"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** Renders the current year on the client, avoiding prerender-time Date usage. */
export function Year() {
  const year = useSyncExternalStore(
    subscribe,
    () => new Date().getFullYear(),
    () => null,
  );
  return <>{year ?? ""}</>;
}

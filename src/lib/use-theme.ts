"use client";

import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

const DARK_QUERY = "(prefers-color-scheme: dark)";

// The theme lives on <html data-theme> (set before paint by the script in the
// root layout), falling back to the system preference.
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributeFilter: ["data-theme"] });
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener("change", onChange);
  return () => {
    observer.disconnect();
    media.removeEventListener("change", onChange);
  };
}

function currentTheme(): Theme {
  const set = document.documentElement.getAttribute("data-theme");
  if (set === "dark" || set === "light") return set;
  return window.matchMedia(DARK_QUERY).matches ? "dark" : "light";
}

/** The active theme, or null while rendering on the server. */
export function useTheme(): Theme | null {
  return useSyncExternalStore<Theme | null>(subscribe, currentTheme, () => null);
}

export function setTheme(theme: Theme): void {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem("rk-theme", theme);
  } catch {
    /* storage may be unavailable */
  }
}

"use client";

import { useEffect } from "react";

type Handler = (event: KeyboardEvent) => void;
type Bindings = Record<string, Handler>;

function isTypingTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return (
    el?.tagName === "INPUT" ||
    el?.tagName === "TEXTAREA" ||
    el?.isContentEditable === true
  );
}

function matchKey(event: KeyboardEvent, combo: string) {
  const parts = combo.toLowerCase().split("+").map((p) => p.trim());
  const key = parts[parts.length - 1];
  const needsMod = parts.includes("mod");
  const needsShift = parts.includes("shift");
  const needsAlt = parts.includes("alt");

  const hasMod = event.metaKey || event.ctrlKey;
  if (needsMod !== hasMod) return false;
  if (needsShift !== event.shiftKey) return false;
  if (needsAlt !== event.altKey) return false;

  const eventKey = event.key.toLowerCase();
  if (key === "enter" && eventKey === "enter") return true;
  return eventKey === key;
}

export function useShortcut(bindings: Bindings, options?: { allowInInput?: string[] }) {
  useEffect(() => {
    function handler(event: KeyboardEvent) {
      const typing = isTypingTarget(event.target);
      for (const [combo, fn] of Object.entries(bindings)) {
        if (matchKey(event, combo)) {
          const allowedInInput =
            options?.allowInInput?.includes(combo) ?? combo.toLowerCase().includes("mod");
          if (typing && !allowedInInput) continue;
          event.preventDefault();
          fn(event);
          return;
        }
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [bindings, options]);
}

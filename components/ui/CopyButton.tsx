"use client";

import { useState } from "react";

import { useDictionary } from "@/lib/i18n/useDictionary";

/**
 * Copies a value without ever rendering it.
 *
 * Invitation codes and links are credentials. Printing one into a table
 * puts it on screen for as long as the page is open, in front of whoever
 * walks past; copying it puts it where the operator actually needs it --
 * the clipboard -- and nowhere else.
 */
export function CopyButton({ value, label }: { value: string; label: string }) {
  const dictionary = useDictionary();
  const [state, setState] = useState<"idle" | "done" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setState("done");
    } catch {
      // Clipboard access is refused in insecure contexts and by some
      // policies. Say so rather than claiming a copy that did not happen.
      setState("failed");
    }
    window.setTimeout(() => setState("idle"), 2000);
  }

  return (
    <button type="button" onClick={copy} disabled={!value}>
      {state === "done" ? dictionary.copied : state === "failed" ? dictionary.copyFailed : label}
    </button>
  );
}

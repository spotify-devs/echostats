"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const SHORTCUTS: Record<string, string> = {
  "g+d": "/dashboard",
  "g+t": "/dashboard/tracks",
  "g+a": "/dashboard/artists",
  "g+g": "/dashboard/genres",
  "g+h": "/dashboard/history",
  "g+p": "/dashboard/patterns",
  "g+l": "/dashboard/playlists",
  "g+r": "/dashboard/recommendations",
  "g+s": "/dashboard/settings",
};

export function useKeyboardShortcuts() {
  const router = useRouter();

  useEffect(() => {
    let lastKey = "";
    let lastTime = 0;

    function handleKeyDown(e: KeyboardEvent) {
      // Don't trigger in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const now = Date.now();
      const key = e.key.toLowerCase();

      // Two-key combos (g+x) within 500ms
      if (now - lastTime < 500) {
        const combo = `${lastKey}+${key}`;
        if (SHORTCUTS[combo]) {
          e.preventDefault();
          router.push(SHORTCUTS[combo]);
          lastKey = "";
          return;
        }
      }

      // Single key shortcuts
      if (key === "/" || key === "k") {
        // Focus search — handled by GlobalSearch component
      }

      if (key === "?") {
        // Show shortcuts help — handled by ShortcutsModal component
      }

      lastKey = key;
      lastTime = now;
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);
}

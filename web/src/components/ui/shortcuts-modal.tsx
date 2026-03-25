"use client";

import { Keyboard, X } from "lucide-react";
import { useEffect, useState } from "react";

const SHORTCUT_GROUPS = [
  {
    title: "Navigation",
    shortcuts: [
      { keys: ["g", "d"], label: "Go to Dashboard" },
      { keys: ["g", "t"], label: "Go to Tracks" },
      { keys: ["g", "a"], label: "Go to Artists" },
      { keys: ["g", "g"], label: "Go to Genres" },
      { keys: ["g", "h"], label: "Go to History" },
      { keys: ["g", "p"], label: "Go to Patterns" },
      { keys: ["g", "s"], label: "Go to Settings" },
    ],
  },
  {
    title: "Actions",
    shortcuts: [
      { keys: ["⌘", "K"], label: "Search" },
      { keys: ["?"], label: "Show shortcuts" },
      { keys: ["Esc"], label: "Close modal / Clear search" },
    ],
  },
];

export function ShortcutsModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (e.key === "?") {
        e.preventDefault();
        setIsOpen((v) => !v);
      }
      if (e.key === "Escape") setIsOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />
      <div className="relative glass-card p-6 max-w-md w-full animate-scale-in space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-theme flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-accent-dynamic" /> Keyboard Shortcuts
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 rounded-lg hover:bg-current/[0.05] text-theme-tertiary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {SHORTCUT_GROUPS.map((group) => (
          <div key={group.title}>
            <h3 className="text-xs text-theme-tertiary uppercase tracking-wider mb-2">
              {group.title}
            </h3>
            <div className="space-y-1.5">
              {group.shortcuts.map((s) => (
                <div key={s.label} className="flex items-center justify-between py-1">
                  <span className="text-sm text-theme-secondary">{s.label}</span>
                  <div className="flex gap-1">
                    {s.keys.map((k) => (
                      <kbd
                        key={k}
                        className="px-2 py-0.5 text-xs font-mono bg-theme-surface-3 text-theme-secondary rounded border border-current/[0.1]"
                      >
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        <p className="text-[10px] text-theme-tertiary text-center">
          Press <kbd className="px-1 py-0.5 bg-theme-surface-3 rounded text-theme-secondary">?</kbd>{" "}
          to toggle
        </p>
      </div>
    </div>
  );
}

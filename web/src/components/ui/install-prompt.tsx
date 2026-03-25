"use client";

import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Check if user previously dismissed
    const wasDismissed = sessionStorage.getItem("echostats-install-dismissed");
    if (wasDismissed) {
      setDismissed(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("echostats-install-dismissed", "true");
  };

  if (isInstalled || dismissed || !deferredPrompt) return null;

  return (
    <div className="mx-4 sm:mx-6 mt-3 flex items-center gap-3 px-4 py-2.5 rounded-xl border border-accent-dynamic/20 bg-accent-dynamic/5 animate-slide-up">
      <Download className="w-4 h-4 text-accent-dynamic flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-theme font-medium">Install EchoStats</p>
        <p className="text-[10px] text-theme-tertiary">
          Add to home screen for a native app experience
        </p>
      </div>
      <button
        onClick={handleInstall}
        className="text-xs text-accent-dynamic hover:text-accent-dynamic/80 px-3 py-1.5 rounded-lg border border-accent-dynamic/30 hover:bg-accent-dynamic/10 transition-all font-medium flex-shrink-0"
      >
        Install
      </button>
      <button
        onClick={handleDismiss}
        className="p-1 text-theme-tertiary hover:text-theme transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

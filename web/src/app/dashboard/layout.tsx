"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SyncBanner } from "@/components/dashboard/sync-banner";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { InstallPrompt } from "@/components/ui/install-prompt";
import { ShortcutsModal } from "@/components/ui/shortcuts-modal";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { api } from "@/lib/api";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();
  useKeyboardShortcuts();

  useEffect(() => {
    api
      .get<{ authenticated: boolean }>("/api/v1/auth/status")
      .then((data) => {
        if (!data.authenticated) {
          router.replace("/");
        } else {
          setAuthChecked(true);
        }
      })
      .catch(() => {
        router.replace("/");
      });
  }, [router]);

  if (!authChecked) {
    return (
      <div
        className="flex h-screen flex-col items-center justify-center gap-5"
        style={{ backgroundColor: "rgb(var(--surface))" }}
      >
        <div className="p-4 rounded-2xl bg-accent-gradient shadow-accent-glow animate-fade-in">
          <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" />
          </svg>
        </div>
        <h1
          className="text-2xl font-bold animate-fade-in"
          style={{
            background: "linear-gradient(135deg, var(--accent-gradient-from), var(--accent-gradient-via), var(--accent-gradient-to))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          EchoStats
        </h1>
        <Loader2 className="w-5 h-5 text-accent-dynamic animate-spin" />
      </div>
    );
  }

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ backgroundColor: "rgb(var(--surface))" }}
    >
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header />
        <InstallPrompt />
        <SyncBanner />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 lg:pb-6">{children}</main>
      </div>
      <BottomNav />
      <ShortcutsModal />
    </div>
  );
}

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
        className="flex h-screen items-center justify-center"
        style={{ backgroundColor: "rgb(var(--surface))" }}
      >
        <Loader2 className="w-8 h-8 text-accent-dynamic animate-spin" />
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

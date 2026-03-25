"use client";

import { SyncBanner } from "@/components/dashboard/sync-banner";
import { BottomNav } from "@/components/layout/bottom-nav";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { ShortcutsModal } from "@/components/ui/shortcuts-modal";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  useKeyboardShortcuts();

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ backgroundColor: "rgb(var(--surface))" }}
    >
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header />
        <SyncBanner />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 lg:pb-6">{children}</main>
      </div>
      <BottomNav />
      <ShortcutsModal />
    </div>
  );
}

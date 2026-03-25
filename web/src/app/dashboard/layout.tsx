"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { BottomNav } from "@/components/layout/bottom-nav";
import { SyncBanner } from "@/components/dashboard/sync-banner";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { ShortcutsModal } from "@/components/ui/shortcuts-modal";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useKeyboardShortcuts();

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
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

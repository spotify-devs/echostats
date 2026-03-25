"use client";

import { Podcast } from "lucide-react";

export default function PodcastsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-theme flex items-center gap-2">
          <Podcast className="w-6 h-6 text-accent-dynamic" /> Podcasts
        </h1>
        <p className="text-theme-secondary mt-1">Your saved shows and episodes</p>
      </div>
      <div className="glass-card p-12 text-center space-y-4">
        <Podcast className="w-16 h-16 text-theme-tertiary mx-auto opacity-30" />
        <p className="text-theme-secondary">Podcast tracking coming soon</p>
        <p className="text-sm text-theme-tertiary">
          Connect your Spotify account to see your podcast listening data
        </p>
      </div>
    </div>
  );
}

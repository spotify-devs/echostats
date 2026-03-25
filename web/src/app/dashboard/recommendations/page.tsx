"use client";

import { Sparkles } from "lucide-react";

export default function RecommendationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-accent-amber" /> Discover
        </h1>
        <p className="text-white/50 mt-1">Personalized recommendations based on your listening</p>
      </div>

      <div className="glass-card p-12 text-center space-y-4">
        <Sparkles className="w-12 h-12 text-accent-amber/30 mx-auto" />
        <p className="text-white/60">Recommendations will be generated once you have enough listening history.</p>
        <p className="text-sm text-white/30">Keep listening and check back soon!</p>
      </div>
    </div>
  );
}

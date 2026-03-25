"use client";

import { Loader2, Music, Search as SearchIcon, Users, X } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";

interface SearchResult {
  type: "track" | "artist";
  id: string;
  name: string;
  subtitle: string;
  imageUrl?: string;
}

export function GlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const debounceRef = useRef<NodeJS.Timeout>(undefined);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Keyboard shortcut: Ctrl+K / Cmd+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
        inputRef.current?.blur();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Search local database
      const [tracksRes, artistsRes] = await Promise.allSettled([
        api.get<any>(`/api/v1/tracks/top?period=all_time&limit=50`),
        api.get<any>(`/api/v1/artists/top?period=all_time&limit=50`),
      ]);

      const searchResults: SearchResult[] = [];
      const lowerQ = q.toLowerCase();

      // Filter tracks
      if (tracksRes.status === "fulfilled" && tracksRes.value?.items) {
        for (const t of tracksRes.value.items) {
          if (t.name?.toLowerCase().includes(lowerQ)) {
            const [name, artist] = (t.name || "").split(" — ");
            searchResults.push({
              type: "track",
              id: t.spotify_id || "",
              name: name || t.name,
              subtitle: artist || "Track",
              imageUrl: t.image_url,
            });
          }
        }
      }

      // Filter artists
      if (artistsRes.status === "fulfilled" && artistsRes.value?.items) {
        for (const a of artistsRes.value.items) {
          if (a.name?.toLowerCase().includes(lowerQ)) {
            searchResults.push({
              type: "artist",
              id: a.spotify_id || "",
              name: a.name,
              subtitle: `${a.play_count || 0} plays`,
              imageUrl: a.image_url,
            });
          }
        }
      }

      setResults(searchResults.slice(0, 10));
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    setIsOpen(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 300);
  };

  const handleSelect = (result: SearchResult) => {
    setIsOpen(false);
    setQuery("");
    if (result.type === "artist") {
      router.push(`/dashboard/artists/${result.id}`);
    } else {
      router.push(`/dashboard/tracks/${result.id}`);
    }
  };

  const Icon = ({ type }: { type: string }) =>
    type === "artist" ? <Users className="w-4 h-4" /> : <Music className="w-4 h-4" />;

  return (
    <div className="relative max-w-md flex-1" ref={containerRef}>
      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-tertiary" />
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => handleInputChange(e.target.value)}
        onFocus={() => query.length >= 2 && setIsOpen(true)}
        placeholder="Search tracks, artists... (⌘K)"
        className="w-full pl-10 pr-10 py-2 bg-theme-surface-2 border border-current/[0.1] rounded-xl text-sm text-theme placeholder:text-theme-tertiary focus:outline-none focus:border-accent-dynamic/50 focus:ring-1 ring-accent-dynamic/25 transition-all"
      />
      {query && (
        <button
          onClick={() => {
            setQuery("");
            setResults([]);
            setIsOpen(false);
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-theme-tertiary hover:text-theme"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Results dropdown */}
      {isOpen && query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 glass-card overflow-hidden z-50 animate-scale-in">
          {isSearching ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 text-accent-dynamic animate-spin" />
            </div>
          ) : results.length > 0 ? (
            <div className="max-h-80 overflow-y-auto divide-y divide-current/[0.08]">
              {results.map((result, i) => (
                <button
                  key={`${result.type}-${result.id}-${i}`}
                  onClick={() => handleSelect(result)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-current/[0.05] transition-colors"
                >
                  <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-theme-surface-3 flex-shrink-0">
                    {result.imageUrl ? (
                      <Image
                        src={result.imageUrl}
                        alt={result.name}
                        fill
                        className="object-cover"
                        sizes="40px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-theme-tertiary">
                        <Icon type={result.type} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-theme truncate">{result.name}</p>
                    <p className="text-xs text-theme-tertiary truncate">{result.subtitle}</p>
                  </div>
                  <span className="text-[10px] text-theme-tertiary uppercase px-2 py-0.5 bg-theme-surface-3 rounded">
                    {result.type}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-sm text-theme-tertiary">
              No results for &ldquo;{query}&rdquo;
            </div>
          )}
        </div>
      )}
    </div>
  );
}

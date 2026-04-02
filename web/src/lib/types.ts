import type { LucideIcon } from "lucide-react";

// Re-export LucideIcon for use across the app
export type { LucideIcon };

// Audio features returned by Spotify / analytics endpoints

export interface AudioFeatures {
  danceability: number;
  energy: number;
  valence: number;
  acousticness: number;
  instrumentalness: number;
  speechiness: number;
  liveness: number;
  tempo: number;
  key: number;
  loudness: number;
}

// Time-based distributions

export interface HourlyDistribution {
  hour: number;
  count: number;
  total_ms: number;
}

export interface DailyDistribution {
  day: number;
  count: number;
  total_ms: number;
}

// Analytics

export interface AnalyticsOverview {
  period: string;
  total_tracks_played: number;
  total_ms_played: number;
  total_hours: number;
  unique_tracks: number;
  unique_artists: number;
  unique_albums: number;
  unique_genres: number;
  top_artists: ArtistPlay[];
  top_tracks: TrackPlay[];
  top_genres: GenrePlay[];
  daily_plays: DailyPlay[];
  day_streak: number;
  hourly_distribution?: HourlyDistribution[];
  daily_distribution?: DailyDistribution[];
  avg_audio_features?: AudioFeatures;
  listening_streak_days?: number;
}

export interface ArtistPlay {
  name: string;
  count: number;
  spotify_id?: string;
  image_url?: string;
  play_count?: number;
  rank?: number;
}

export interface TrackPlay {
  name: string;
  artist_name: string;
  count: number;
  spotify_id?: string;
  album_name?: string;
  album_image_url?: string;
  image_url?: string;
  play_count?: number;
  rank?: number;
}

export interface GenrePlay {
  name: string;
  count: number;
  play_count?: number;
}

export interface DailyPlay {
  date: string;
  plays: number;
  ms: number;
}

// Top items as returned by the backend analytics endpoints

export interface TopItem {
  spotify_id: string;
  name: string;
  play_count: number;
  total_ms: number;
  image_url: string;
  rank: number;
}

// Paginated API response wrapper

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  pages: number;
}

// Genre distribution endpoint

export interface GenreDistributionItem {
  name: string;
  play_count: number;
}

export interface GenreDistributionResponse {
  genres: GenreDistributionItem[];
  total_genres: number;
}

// Listening History

export interface HistoryTrackRef {
  spotify_id: string;
  name: string;
  artist_name: string;
  album_name: string;
  album_image_url: string;
  duration_ms: number;
}

export interface ListeningHistoryItem {
  id: string;
  user_id: string;
  track: HistoryTrackRef;
  played_at: string;
  ms_played: number | null;
  source: string;
  context_type: string;
  context_uri: string;
}

// Sync Jobs

export interface SyncStep {
  action: string;
  status: string;
  detail: string;
  items: number;
  error: string | null;
  completed_at: string | null;
}

export interface SyncJob {
  id: string;
  user_id: string;
  job_type: string;
  status: string;
  items_processed: number;
  items_total: number;
  error_message: string | null;
  steps: SyncStep[];
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

// Health

export interface HealthStatus {
  status: string;
  service: string;
  version: string;
}

// Auth

export interface AuthStatus {
  authenticated: boolean;
  user_id?: string;
  spotify_id?: string;
  display_name?: string;
  token_expires_at?: string;
  user?: {
    display_name?: string;
    image_url?: string;
    spotify_id?: string;
    product?: string;
  };
}

// Player

export interface NowPlayingResponse {
  is_playing: boolean;
  track_name: string;
  artist_name: string;
  album_name: string;
  album_image: string;
  duration_ms: number;
  progress_ms: number;
  shuffle: boolean;
  repeat: string;
  device: PlayerDevice;
}

export interface PlayerDevice {
  id: string;
  name: string;
  type: string;
  is_active: boolean;
}

export interface QueueTrack {
  id: string;
  name: string;
  artist: string;
  image: string;
}

export interface QueueResponse {
  queue: QueueTrack[];
}

// API Logs

export interface ApiLogEntry {
  id: string;
  timestamp: string;
  method: string;
  endpoint: string;
  status_code: number;
  latency_ms: number;
  error: string | null;
}

export interface ApiLogStats {
  total_calls: number;
  success_rate: number;
  rate_limit_count: number;
  error_count: number;
  avg_latency_ms: number;
  top_endpoints: { endpoint: string; count: number }[];
  status_distribution: Record<string, number>;
}

// Playlists

export interface SpotifyPlaylist {
  spotify_id: string;
  name: string;
  total_tracks: number;
  images: { url: string }[];
  description?: string;
}

// Library

export interface LibraryArtist {
  id: string;
  name: string;
  image: string;
  followers: number;
}

export interface LibraryAlbum {
  id: string;
  name: string;
  image: string;
  artists: string;
  total_tracks: number;
}

// Trend data

export interface TrendPoint {
  label: string;
  plays: number;
  hours: number;
}

export interface TrendResponse {
  points: TrendPoint[];
  granularity: string;
}

// Update check

export interface UpdateInfo {
  update_available: boolean;
  current_version: string;
  latest_version: string;
  published_at: string;
  release_url: string;
  release_notes: string;
}

// Recommendations

export interface RecommendationTrack {
  id: string;
  name: string;
  artist: string;
  album: string;
  album_image: string;
  duration_ms: number;
  external_url: string;
  audio_features?: AudioFeatures;
}

export interface RecommendationsResponse {
  items: RecommendationTrack[];
  total: number;
  seed_info: {
    top_artist?: string;
    top_genre?: string;
    [key: string]: unknown;
  };
}

// Spotify detail pages

export interface SpotifyArtistDetail {
  name: string;
  spotify_id: string;
  genres: string[];
  images: { url: string }[];
  followers: { total: number };
  popularity: number;
  external_url: string;
}

export interface SpotifyTrackDetail {
  name: string;
  spotify_id: string;
  duration_ms: number;
  explicit: boolean;
  external_url: string;
  album: { name: string; image_url: string; release_date: string };
  artists: { name: string; spotify_id: string }[];
  audio_features?: AudioFeatures;
}

// Recharts tooltip props

export interface RechartsTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

// Rollup status

export interface RollupStatus {
  rollup_days: number;
  history_days: number;
  is_building: boolean;
  started_at: string | null;
  last_built_at: string | null;
  items_processed: number;
}

// Sync job stats

export interface SyncJobStats {
  total_jobs: number;
  completed: number;
  failed: number;
  running: number;
  total_items_synced: number;
  last_sync_at: string | null;
  avg_duration_ms: number;
}

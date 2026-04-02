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
}

export interface ArtistPlay {
  name: string;
  count: number;
  spotify_id?: string;
}

export interface TrackPlay {
  name: string;
  artist_name: string;
  count: number;
  spotify_id?: string;
  album_name?: string;
  album_image_url?: string;
}

export interface GenrePlay {
  name: string;
  count: number;
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
}

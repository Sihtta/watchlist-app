export type MediaType = 'film' | 'serie';
export type MediaStatus = 'non-vu' | 'en-cours' | 'vu';
export type MediaSource = 'tmdb' | 'manual';

export interface MediaItem {
  id: string;
  title: string;
  type: MediaType;
  status: MediaStatus;
  updatedAt: string;
  source?: MediaSource;

  poster?: string;
  year?: string;
  seasonLabel?: string;

  duration?: number;
  episodeDuration?: number;

  totalMinutes?: number;
  watchedMinutes?: number;

  totalEpisodes?: number;
  watchedEpisodes?: number;
  totalSeasons?: number;
  seasonEpisodeCounts?: number[];

  creator?: string;
  actors?: string[];
  genres?: string[];
  synopsis?: string;
}
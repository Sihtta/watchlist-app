export type MediaType = 'film' | 'serie';
export type MediaStatus = 'non-vu' | 'en-cours' | 'vu';

export interface MediaItem {
  id: string;
  title: string;
  type: MediaType;
  poster?: string;

  year?: string;

  status: MediaStatus;
  updatedAt: string;

  seasonLabel?: string;

  duration?: number;
  episodeDuration?: number;

  totalMinutes?: number;
  watchedMinutes?: number;

  totalEpisodes?: number;
  watchedEpisodes?: number;
  totalSeasons?: number;

  creator?: string;
  actors?: string[];
  genres?: string[];

  synopsis?: string;
}

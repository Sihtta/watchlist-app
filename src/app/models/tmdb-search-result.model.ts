export type TmdbMediaType = 'movie' | 'tv';

export interface TmdbSearchResult {
  id: number;
  mediaType: TmdbMediaType;
  title: string;
  posterUrl: string | null;
  rating: number;
  year: string;
  genres: string[];
}
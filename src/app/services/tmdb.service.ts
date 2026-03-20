import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { TmdbSearchResult } from '../models/tmdb-search-result.model';

interface TmdbRawItem {
  id: number;
  media_type?: 'movie' | 'tv' | 'person';
  title?: string;
  name?: string;
  poster_path?: string | null;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
}

interface TmdbMediaItem extends TmdbRawItem {
  media_type: 'movie' | 'tv';
}

interface TmdbMultiSearchResponse {
  results: TmdbRawItem[];
}

interface TmdbTrendingResponse {
  results: TmdbRawItem[];
}

interface TmdbDiscoverResponse {
  results: TmdbRawItem[];
}

@Injectable({
  providedIn: 'root'
})
export class TmdbService {
  private readonly apiUrl = 'https://api.themoviedb.org/3';
  private readonly imageBaseUrl = 'https://image.tmdb.org/t/p/w500';

  private readonly movieGenreMap: Record<number, string> = {
    28: 'Action',
    12: 'Aventure',
    16: 'Animation',
    35: 'Comédie',
    80: 'Policier',
    99: 'Documentaire',
    18: 'Drame',
    10751: 'Comédie',
    14: 'Fantastique',
    36: 'Drame',
    27: 'Horreur',
    10402: 'Comédie',
    9648: 'Policier',
    10749: 'Romance',
    878: 'Science-fiction',
    10770: 'Drame',
    53: 'Policier',
    10752: 'Action',
    37: 'Aventure'
  };

  private readonly tvGenreMap: Record<number, string> = {
    10759: 'Action',
    16: 'Animation',
    35: 'Comédie',
    80: 'Policier',
    99: 'Documentaire',
    18: 'Drame',
    10751: 'Comédie',
    10762: 'Animation',
    9648: 'Policier',
    10763: 'Documentaire',
    10764: 'Documentaire',
    10765: 'Science-fiction',
    10766: 'Romance',
    10767: 'Documentaire',
    10768: 'Action',
    37: 'Aventure'
  };

  constructor(private http: HttpClient) {}

  searchMedia(query: string): Observable<TmdbSearchResult[]> {
    const params = new HttpParams()
      .set('query', query)
      .set('language', 'fr-FR')
      .set('include_adult', 'false');

    return this.http
      .get<TmdbMultiSearchResponse>(`${this.apiUrl}/search/multi`, {
        headers: this.buildHeaders(),
        params
      })
      .pipe(
        map(response =>
          response.results
            .filter((item): item is TmdbMediaItem =>
              item.media_type === 'movie' || item.media_type === 'tv'
            )
            .map(item => this.mapMediaItem(item))
        )
      );
  }

  getDefaultMedia(): Observable<TmdbSearchResult[]> {
    return this.http
      .get<TmdbTrendingResponse>(`${this.apiUrl}/trending/all/week`, {
        headers: this.buildHeaders(),
        params: new HttpParams().set('language', 'fr-FR')
      })
      .pipe(
        map(response =>
          response.results
            .filter((item): item is TmdbMediaItem =>
              item.media_type === 'movie' || item.media_type === 'tv'
            )
            .map(item => this.mapMediaItem(item))
        )
      );
  }

  getPopularMedia(): Observable<TmdbSearchResult[]> {
    const movieRequest = this.http.get<TmdbDiscoverResponse>(
      `${this.apiUrl}/discover/movie`,
      {
        headers: this.buildHeaders(),
        params: new HttpParams()
          .set('language', 'fr-FR')
          .set('include_adult', 'false')
          .set('sort_by', 'popularity.desc')
          .set('vote_count.gte', '200')
      }
    );

    const tvRequest = this.http.get<TmdbDiscoverResponse>(
      `${this.apiUrl}/discover/tv`,
      {
        headers: this.buildHeaders(),
        params: new HttpParams()
          .set('language', 'fr-FR')
          .set('sort_by', 'popularity.desc')
          .set('vote_count.gte', '100')
      }
    );

    return forkJoin([movieRequest, tvRequest]).pipe(
      map(([movies, series]) => {
        const mappedMovies = movies.results.map(item =>
          this.mapMediaItem({ ...item, media_type: 'movie' })
        );
        const mappedSeries = series.results.map(item =>
          this.mapMediaItem({ ...item, media_type: 'tv' })
        );

        return [...mappedMovies, ...mappedSeries]
          .sort((a, b) => b.rating - a.rating)
          .slice(0, 20);
      })
    );
  }

  private buildHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${environment.tmdbReadToken}`
    });
  }

  private mapMediaItem(item: TmdbMediaItem): TmdbSearchResult {
    return {
      id: item.id,
      mediaType: item.media_type,
      title: item.title || item.name || 'Sans titre',
      posterUrl: item.poster_path
        ? `${this.imageBaseUrl}${item.poster_path}`
        : null,
      rating: Number((item.vote_average ?? 0).toFixed(1)),
      year: this.extractYear(item.release_date || item.first_air_date),
      genres: this.mapGenres(item.genre_ids ?? [], item.media_type)
    };
  }

  private mapGenres(
    genreIds: number[],
    mediaType: 'movie' | 'tv'
  ): string[] {
    const sourceMap =
      mediaType === 'movie' ? this.movieGenreMap : this.tvGenreMap;

    const genres = genreIds
      .map(id => sourceMap[id])
      .filter((genre): genre is string => !!genre);

    return [...new Set(genres)];
  }

  private extractYear(date?: string): string {
    if (!date || date.length < 4) {
      return '';
    }

    return date.slice(0, 4);
  }

  getMovieDetails(id: string): Observable<any> {
    const params = new HttpParams()
      .set('language', 'fr-FR')
      .set('append_to_response', 'credits');

    return this.http.get<any>(`${this.apiUrl}/movie/${id}`, {
      headers: this.buildHeaders(),
      params
    });
  }

  getTvDetails(id: string): Observable<any> {
    const params = new HttpParams()
      .set('language', 'fr-FR')
      .set('append_to_response', 'credits');

    return this.http.get<any>(`${this.apiUrl}/tv/${id}`, {
      headers: this.buildHeaders(),
      params
    });
  }
}
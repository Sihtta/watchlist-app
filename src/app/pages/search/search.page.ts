import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { Router } from '@angular/router';
import { TmdbService } from '../../services/tmdb.service';
import { TmdbSearchResult } from '../../models/tmdb-search-result.model';
import { WatchlistService } from '../../services/watchlist';

@Component({
  selector: 'app-search',
  templateUrl: './search.page.html',
  styleUrls: ['./search.page.scss'],
  standalone: false
})
export class SearchPage implements OnInit {
  query = '';
  allResults: TmdbSearchResult[] = [];
  filteredResults: TmdbSearchResult[] = [];
  loading = false;
  hasSearched = false;
  showFilters = false;

  selectedType = 'Tous';
  selectedGenre = 'Tous';
  minRating = 0;

  readonly typeFilters = ['Tous', 'Film', 'Série'];
  readonly genreFilters = [
    'Tous',
    'Action',
    'Aventure',
    'Comédie',
    'Horreur',
    'Romance',
    'Animation',
    'Policier',
    'Fantastique',
    'Science-fiction'
  ];

  constructor(
    private tmdbService: TmdbService,
    private watchlistService: WatchlistService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadMedia();
  }

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.query = input?.value?.trim() ?? '';

    if (this.query.length === 0) {
      this.loadMedia();
      return;
    }

    if (this.query.length < 2) {
      this.hasSearched = true;
      this.clearResults();
      return;
    }

    this.loadMedia();
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  selectType(type: string): void {
    this.selectedType = type;
    this.loadMedia();
  }

  selectGenre(genre: string): void {
    this.selectedGenre = genre;
    this.loadMedia();
  }

  onMinRatingChange(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.minRating = Number(input?.value ?? 0);
    this.loadMedia();
  }

  getTypeLabel(mediaType: 'movie' | 'tv'): string {
    return mediaType === 'movie' ? 'Film' : 'Série';
  }

  isAlreadySaved(item: TmdbSearchResult): boolean {
    return this.watchlistService.isSavedTmdbItem(item);
  }

  goToDetail(item: TmdbSearchResult): void {
    this.router.navigate(['/movie-detail', item.id], {
      queryParams: { type: item.mediaType }
    });
  }

  hasActiveFilters(): boolean {
    return (
      this.selectedType !== 'Tous' ||
      this.selectedGenre !== 'Tous' ||
      this.minRating > 0
    );
  }

  getActiveFiltersLabel(): string {
    const parts: string[] = [];

    if (this.selectedType !== 'Tous') {
      parts.push(this.selectedType);
    }

    if (this.selectedGenre !== 'Tous') {
      parts.push(this.selectedGenre);
    }

    if (this.minRating > 0) {
      parts.push(`${this.minRating} ★`);
    }

    return parts.join(', ');
  }

  async addMedia(event: Event, item: TmdbSearchResult): Promise<void> {
    event.stopPropagation();

    if (this.isAlreadySaved(item)) {
      await this.watchlistService.removeById(String(item.id));
      return;
    }

    await this.watchlistService.addFromTmdb(item);
  }

  private loadMedia(): void {
    if (this.query.length > 0 && this.query.length < 2) {
      this.hasSearched = true;
      this.clearResults();
      return;
    }

    this.loading = true;
    this.hasSearched = this.query.length >= 2;

    this.getMediaSource().subscribe({
      next: results => this.handleSuccess(results),
      error: error => this.handleError(error)
    });
  }

  private getMediaSource(): Observable<TmdbSearchResult[]> {
    if (this.query.length >= 2) {
      return this.tmdbService.searchMedia(this.query);
    }

    if (this.hasActiveFilters()) {
      return this.tmdbService.discoverMedia(
        this.selectedType,
        this.selectedGenre,
        this.minRating
      );
    }

    return this.tmdbService.getDefaultMedia();
  }

  private handleSuccess(results: TmdbSearchResult[]): void {
    this.allResults = results;
    this.applyFilters();
    this.loading = false;
  }

  private handleError(error: unknown): void {
    console.error('Erreur TMDB :', error);
    this.clearResults();
    this.loading = false;
  }

  private clearResults(): void {
    this.allResults = [];
    this.filteredResults = [];
  }

  private applyFilters(): void {
    this.filteredResults = this.allResults.filter(item => {
      const matchesType =
        this.selectedType === 'Tous' ||
        (this.selectedType === 'Film' && item.mediaType === 'movie') ||
        (this.selectedType === 'Série' && item.mediaType === 'tv');

      const matchesGenre =
        this.selectedGenre === 'Tous' ||
        item.genres.includes(this.selectedGenre);

      const matchesRating = item.rating >= this.minRating;

      return matchesType && matchesGenre && matchesRating;
    });
  }
}
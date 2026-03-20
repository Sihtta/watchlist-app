import { Component, OnInit } from '@angular/core';
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
    this.loadDefaultMedia();
  }

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const value = input?.value?.trim() ?? '';

    this.query = value;

    if (value.length === 0) {
      this.loadDefaultMedia();
      return;
    }

    if (value.length < 2) {
      this.allResults = [];
      this.filteredResults = [];
      this.loading = false;
      this.hasSearched = true;
      return;
    }

    this.loading = true;
    this.hasSearched = true;

    this.tmdbService.searchMedia(value).subscribe({
      next: data => {
        this.allResults = data;
        this.applyFilters();
        this.loading = false;
      },
      error: error => {
        console.error('Erreur TMDB :', error);
        this.allResults = [];
        this.filteredResults = [];
        this.loading = false;
      }
    });
  }

  toggleFilters(): void {
    this.showFilters = !this.showFilters;
  }

  selectType(filter: string): void {
    this.selectedType = filter;
    this.applyFilters();
  }

  selectGenre(genre: string): void {
    this.selectedGenre = genre;
    this.applyFilters();
  }

  onMinRatingChange(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    this.minRating = Number(input?.value ?? 0);
    this.applyFilters();
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

  private loadDefaultMedia(): void {
    this.loading = true;
    this.hasSearched = false;

    this.tmdbService.getDefaultMedia().subscribe({
      next: data => {
        this.allResults = data;
        this.applyFilters();
        this.loading = false;
      },
      error: error => {
        console.error('Erreur TMDB :', error);
        this.allResults = [];
        this.filteredResults = [];
        this.loading = false;
      }
    });
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

  async addMedia(event: Event, item: TmdbSearchResult): Promise<void> {
    event.stopPropagation();

    if (this.isAlreadySaved(item)) {
      await this.watchlistService.removeTmdbItem(item);
      return;
    }

    await this.watchlistService.addFromTmdb(item);
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
}
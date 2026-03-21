import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MediaItem } from '../../models/media.model';
import { TmdbSearchResult } from '../../models/tmdb-search-result.model';
import { WatchlistService } from '../../services/watchlist';

@Component({
  selector: 'app-movies',
  templateUrl: './films.page.html',
  standalone: false,
  styleUrls: ['./films.page.scss']
})
export class FilmsPage implements OnInit {
  movies: MediaItem[] = [];
  selectedStatus: 'Tous' | 'en-cours' | 'non-vu' | 'vu' = 'Tous';

  constructor(
    private watchlistService: WatchlistService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.load();

    this.watchlistService.media$.subscribe(() => {
      this.load();
    });
  }

  ionViewWillEnter(): void {
    this.load();
  }

  get filteredMovies(): MediaItem[] {
    if (this.selectedStatus === 'Tous') {
      return this.movies;
    }

    return this.movies.filter(movie => movie.status === this.selectedStatus);
  }

  selectStatus(status: 'Tous' | 'en-cours' | 'non-vu' | 'vu'): void {
    this.selectedStatus = status;
  }

  load(): void {
    this.movies = this.watchlistService.getFilms();
  }

  goToSearch(): void {
    this.router.navigate(['/tabs/search']);
  }

  goToDetail(movie: MediaItem): void {
    this.router.navigate(['/movie-detail', movie.id], {
      queryParams: { type: 'movie' }
    });
  }

  async toggleSaved(event: Event, movie: MediaItem): Promise<void> {
    event.stopPropagation();

    const item: TmdbSearchResult = {
      id: Number(movie.id),
      mediaType: 'movie',
      title: movie.title,
      posterUrl: movie.poster || null,
      rating: 0,
      year: movie.year || '',
      genres: []
    };

    await this.watchlistService.removeTmdbItem(item);
  }
}
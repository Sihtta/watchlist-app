import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MediaItem, MediaStatus } from '../../models/media.model';
import { WatchlistService } from '../../services/watchlist';

type StatusFilter = 'Tous' | MediaStatus;

@Component({
  selector: 'app-movies',
  templateUrl: './films.page.html',
  standalone: false,
  styleUrls: ['./films.page.scss']
})
export class FilmsPage implements OnInit, OnDestroy {
  movies: MediaItem[] = [];
  selectedStatus: StatusFilter = 'Tous';

  readonly statusFilters: StatusFilter[] = ['Tous', 'en-cours', 'non-vu', 'vu'];

  private mediaSubscription?: Subscription;

  constructor(
    private watchlistService: WatchlistService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadMovies();

    this.mediaSubscription = this.watchlistService.media$.subscribe(() => {
      this.loadMovies();
    });
  }

  ngOnDestroy(): void {
    this.mediaSubscription?.unsubscribe();
  }

  ionViewWillEnter(): void {
    this.loadMovies();
  }

  get filteredMovies(): MediaItem[] {
    if (this.selectedStatus === 'Tous') {
      return this.movies;
    }

    return this.movies.filter(movie => movie.status === this.selectedStatus);
  }

  selectStatus(status: StatusFilter): void {
    this.selectedStatus = status;
  }

  goToSearch(): void {
    this.router.navigate(['/tabs/search']);
  }

  goToDetail(movie: MediaItem): void {
    this.router.navigate(['/movie-detail', movie.id], {
      queryParams: { type: 'movie' }
    });
  }

  async removeMovie(event: Event, movie: MediaItem): Promise<void> {
    event.stopPropagation();
    await this.watchlistService.removeById(movie.id);
  }

  getStatusLabel(status: MediaStatus): string {
    if (status === 'en-cours') {
      return 'En cours';
    }

    if (status === 'vu') {
      return 'Vu';
    }

    return 'À voir';
  }

  hasProgress(movie: MediaItem): boolean {
    return movie.status === 'en-cours' && (movie.totalMinutes || 0) > 0;
  }

  private loadMovies(): void {
    this.movies = this.watchlistService.getFilms();
  }
}
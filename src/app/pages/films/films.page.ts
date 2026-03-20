import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MediaItem } from '../../models/media.model';
import { WatchlistService } from '../../services/watchlist';

@Component({
  selector: 'app-movies',
  templateUrl: './films.page.html',
  standalone: false,
  styleUrls: ['./films.page.scss']
})
export class FilmsPage implements OnInit {
  movies: MediaItem[] = [];

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
}
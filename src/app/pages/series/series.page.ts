import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MediaItem } from '../../models/media.model';
import { WatchlistService } from '../../services/watchlist';

@Component({
  selector: 'app-series',
  templateUrl: './series.page.html',
  standalone: false,
  styleUrls: ['./series.page.scss']
})
export class SeriesPage implements OnInit {
  series: MediaItem[] = [];

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
    this.series = this.watchlistService.getSeries();
  }

  goToSearch(): void {
    this.router.navigate(['/tabs/search']);
  }

  goToDetail(item: MediaItem): void {
    this.router.navigate(['/movie-detail', item.id], {
      queryParams: { type: 'tv' }
    });
  }
}
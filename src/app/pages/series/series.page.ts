import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MediaItem } from '../../models/media.model';
import { TmdbSearchResult } from '../../models/tmdb-search-result.model';
import { WatchlistService } from '../../services/watchlist';

@Component({
  selector: 'app-series',
  templateUrl: './series.page.html',
  standalone: false,
  styleUrls: ['./series.page.scss']
})
export class SeriesPage implements OnInit {
  series: MediaItem[] = [];
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

  get filteredSeries(): MediaItem[] {
    if (this.selectedStatus === 'Tous') {
      return this.series;
    }

    return this.series.filter(item => item.status === this.selectedStatus);
  }

  selectStatus(status: 'Tous' | 'en-cours' | 'non-vu' | 'vu'): void {
    this.selectedStatus = status;
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

  async toggleSaved(event: Event, item: MediaItem): Promise<void> {
    event.stopPropagation();

    const media: TmdbSearchResult = {
      id: Number(item.id),
      mediaType: 'tv',
      title: item.title,
      posterUrl: item.poster || null,
      rating: 0,
      year: item.year || '',
      genres: []
    };

    await this.watchlistService.removeTmdbItem(media);
  }
}
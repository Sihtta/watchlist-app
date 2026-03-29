import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { MediaItem, MediaStatus } from '../../models/media.model';
import { WatchlistService } from '../../services/watchlist';

type StatusFilter = 'Tous' | MediaStatus;

@Component({
  selector: 'app-series',
  templateUrl: './series.page.html',
  standalone: false,
  styleUrls: ['./series.page.scss']
})
export class SeriesPage implements OnInit, OnDestroy {
  series: MediaItem[] = [];
  selectedStatus: StatusFilter = 'Tous';

  readonly statusFilters: StatusFilter[] = ['Tous', 'en-cours', 'non-vu', 'vu'];

  private mediaSubscription?: Subscription;

  constructor(
    private watchlistService: WatchlistService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadSeries();

    this.mediaSubscription = this.watchlistService.media$.subscribe(() => {
      this.loadSeries();
    });
  }

  ngOnDestroy(): void {
    this.mediaSubscription?.unsubscribe();
  }

  ionViewWillEnter(): void {
    this.loadSeries();
  }

  get filteredSeries(): MediaItem[] {
    if (this.selectedStatus === 'Tous') {
      return this.series;
    }

    return this.series.filter(item => item.status === this.selectedStatus);
  }

  selectStatus(status: StatusFilter): void {
    this.selectedStatus = status;
  }

  goToSearch(): void {
    this.router.navigate(['/tabs/search']);
  }

  goToDetail(item: MediaItem): void {
    this.router.navigate(['/movie-detail', item.id], {
      queryParams: { type: 'tv' }
    });
  }

  async removeSeries(event: Event, item: MediaItem): Promise<void> {
    event.stopPropagation();
    await this.watchlistService.removeById(item.id);
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

  hasProgress(item: MediaItem): boolean {
    return item.status === 'en-cours' && (item.totalEpisodes || 0) > 0;
  }

  private loadSeries(): void {
    this.series = this.watchlistService.getSeries();
  }
}
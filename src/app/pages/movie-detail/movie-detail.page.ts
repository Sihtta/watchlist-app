import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MediaItem, MediaStatus } from '../../models/media.model';
import { WatchlistService } from '../../services/watchlist';

@Component({
  selector: 'app-movie-detail',
  templateUrl: './movie-detail.page.html',
  styleUrls: ['./movie-detail.page.scss'],
  standalone: false
})
export class MovieDetailPage implements OnInit {

  media?: MediaItem;
  selectedSeason = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private watchlistService: WatchlistService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.router.navigate(['/tabs/dashboard']);
      return;
    }

    const foundMedia = this.watchlistService.getMediaById(id);

    if (!foundMedia) {
      this.router.navigate(['/tabs/dashboard']);
      return;
    }

    this.media = { ...foundMedia };
    this.selectedSeason = this.media.seasonLabel || 'Saison 1';
  }

  goBack(): void {
    this.router.navigate(['/tabs/dashboard']);
  }

  isSeries(): boolean {
    return this.media?.type === 'serie';
  }

  isFilm(): boolean {
    return this.media?.type === 'film';
  }

  getActorsText(): string {
    return this.media?.actors?.join(', ') || '';
  }

  getGenresText(): string {
    return this.media?.genres?.join(', ') || '';
  }

  async setStatus(status: MediaStatus): Promise<void> {
    if (!this.media) return;

    this.media.status = status;

    if (this.isFilm()) {
      const total = this.media.totalMinutes || this.media.duration || 0;

      if (status === 'vu') {
        this.media.watchedMinutes = total;
      } else if (status === 'non-vu') {
        this.media.watchedMinutes = 0;
      } else {
        if ((this.media.watchedMinutes || 0) <= 0 && total > 0) {
          this.media.watchedMinutes = 1;
        }
        if ((this.media.watchedMinutes || 0) >= total && total > 0) {
          this.media.watchedMinutes = total - 1;
        }
      }
    }

    if (this.isSeries()) {
      const total = this.media.totalEpisodes || 0;

      if (status === 'vu') {
        this.media.watchedEpisodes = total;
      } else if (status === 'non-vu') {
        this.media.watchedEpisodes = 0;
      } else {
        if ((this.media.watchedEpisodes || 0) <= 0 && total > 0) {
          this.media.watchedEpisodes = 1;
        }
        if ((this.media.watchedEpisodes || 0) >= total && total > 0) {
          this.media.watchedEpisodes = total - 1;
        }
      }
    }

    this.media.updatedAt = new Date().toISOString();
    await this.watchlistService.updateMedia(this.media);
  }

  async decreaseProgress(): Promise<void> {
    if (!this.media) return;

    if (this.isFilm()) {
      const current = this.media.watchedMinutes || 0;
      this.media.watchedMinutes = Math.max(0, current - 1);

      const total = this.media.totalMinutes || this.media.duration || 0;
      this.updateStatusFromFilmProgress(total);
    }

    if (this.isSeries()) {
      const current = this.media.watchedEpisodes || 0;
      this.media.watchedEpisodes = Math.max(0, current - 1);

      const total = this.media.totalEpisodes || 0;
      this.updateStatusFromSeriesProgress(total);
    }

    this.media.updatedAt = new Date().toISOString();
    await this.watchlistService.updateMedia(this.media);
  }

  async increaseProgress(): Promise<void> {
    if (!this.media) return;

    if (this.isFilm()) {
      const total = this.media.totalMinutes || this.media.duration || 0;
      const current = this.media.watchedMinutes || 0;
      this.media.watchedMinutes = Math.min(total, current + 1);

      this.updateStatusFromFilmProgress(total);
    }

    if (this.isSeries()) {
      const total = this.media.totalEpisodes || 0;
      const current = this.media.watchedEpisodes || 0;
      this.media.watchedEpisodes = Math.min(total, current + 1);

      this.updateStatusFromSeriesProgress(total);
    }

    this.media.updatedAt = new Date().toISOString();
    await this.watchlistService.updateMedia(this.media);
  }

  onSeasonChange(): void {
    if (!this.media) return;
    this.media.seasonLabel = this.selectedSeason;
  }

  private updateStatusFromFilmProgress(total: number): void {
    if (!this.media) return;

    const watched = this.media.watchedMinutes || 0;

    if (watched <= 0) {
      this.media.status = 'non-vu';
    } else if (watched >= total) {
      this.media.status = 'vu';
    } else {
      this.media.status = 'en-cours';
    }
  }

  private updateStatusFromSeriesProgress(total: number): void {
    if (!this.media) return;

    const watched = this.media.watchedEpisodes || 0;

    if (watched <= 0) {
      this.media.status = 'non-vu';
    } else if (watched >= total) {
      this.media.status = 'vu';
    } else {
      this.media.status = 'en-cours';
    }
  }
}
import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MediaItem, MediaStatus } from '../../models/media.model';
import { WatchlistService } from '../../services/watchlist';
import { TmdbService } from '../../services/tmdb.service';

@Component({
  selector: 'app-movie-detail',
  templateUrl: './movie-detail.page.html',
  styleUrls: ['./movie-detail.page.scss'],
  standalone: false
})
export class MovieDetailPage implements OnInit {
  media?: MediaItem;
  selectedSeason = '';
  seasonOptions: string[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private watchlistService: WatchlistService,
    private tmdbService: TmdbService,
    private location: Location
  ) {}

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    const typeParam = this.route.snapshot.queryParamMap.get('type');

    if (!id || !typeParam) {
      this.router.navigate(['/tabs/dashboard']);
      return;
    }

    try {
      const localMedia = this.watchlistService.getMediaById(id);

      let apiMedia: MediaItem | null = null;

      if (typeParam === 'movie') {
        const details = await firstValueFrom(this.tmdbService.getMovieDetails(id));
        apiMedia = this.mapMovieDetailsToMediaItem(details);
      } else if (typeParam === 'tv') {
        const details = await firstValueFrom(this.tmdbService.getTvDetails(id));
        apiMedia = this.mapTvDetailsToMediaItem(details);
      }

      if (!apiMedia) {
        this.router.navigate(['/tabs/dashboard']);
        return;
      }

      this.media = this.mergeApiAndLocalData(apiMedia, localMedia);
      this.buildSeasonOptions();

      this.selectedSeason = this.media.seasonLabel || this.seasonOptions[0] || '';

      if (localMedia) {
        this.media.updatedAt = new Date().toISOString();
        await this.watchlistService.updateMedia(this.media);
      }
    } catch (error) {
      console.error('Erreur chargement détails média :', error);
      this.router.navigate(['/tabs/dashboard']);
    }
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }

    this.router.navigate(['/tabs/dashboard']);
  }

  goToDashboard(): void {
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

  async onSeasonChange(): Promise<void> {
    if (!this.media) return;

    this.media.seasonLabel = this.selectedSeason;
    this.media.updatedAt = new Date().toISOString();
    await this.watchlistService.updateMedia(this.media);
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

  private buildSeasonOptions(): void {
    if (!this.media || !this.isSeries()) {
      this.seasonOptions = [];
      return;
    }

    const seasonCount = this.media.totalSeasons || 0;
    this.seasonOptions = Array.from(
      { length: seasonCount },
      (_, i) => `Saison ${i + 1}`
    );
  }

  private mergeApiAndLocalData(apiMedia: MediaItem, localMedia?: MediaItem): MediaItem {
    if (!localMedia) {
      return {
        ...apiMedia,
        status: apiMedia.status || 'non-vu',
        watchedMinutes: apiMedia.watchedMinutes || 0,
        watchedEpisodes: apiMedia.watchedEpisodes || 0,
        updatedAt: new Date().toISOString()
      };
    }

    return {
      ...apiMedia,
      status: localMedia.status,
      watchedMinutes: localMedia.watchedMinutes,
      watchedEpisodes: localMedia.watchedEpisodes,
      seasonLabel: localMedia.seasonLabel,
      updatedAt: localMedia.updatedAt
    };
  }

  private mapMovieDetailsToMediaItem(details: any): MediaItem {
    const director = details.credits?.crew?.find((person: any) => person.job === 'Director');

    return {
      id: String(details.id),
      type: 'film',
      title: details.title || 'Sans titre',
      poster: details.poster_path
        ? `https://image.tmdb.org/t/p/w500${details.poster_path}`
        : 'assets/mock/placeholder.jpg',
      year: details.release_date ? new Date(details.release_date).getFullYear().toString() : '',
      synopsis: details.overview || '',
      duration: details.runtime || 0,
      totalMinutes: details.runtime || 0,
      creator: director?.name || '',
      actors: (details.credits?.cast || []).slice(0, 5).map((actor: any) => actor.name),
      genres: (details.genres || []).map((genre: any) => genre.name),
      status: 'non-vu',
      watchedMinutes: 0,
      updatedAt: new Date().toISOString()
    };
  }

  private mapTvDetailsToMediaItem(details: any): MediaItem {
    const avgEpisodeDuration = details.episode_run_time?.length
      ? details.episode_run_time[0]
      : 0;

    return {
      id: String(details.id),
      type: 'serie',
      title: details.name || 'Sans titre',
      poster: details.poster_path
        ? `https://image.tmdb.org/t/p/w500${details.poster_path}`
        : 'assets/mock/placeholder.jpg',
      year: details.first_air_date ? new Date(details.first_air_date).getFullYear().toString() : '',
      synopsis: details.overview || '',
      episodeDuration: avgEpisodeDuration,
      totalEpisodes: details.number_of_episodes || 0,
      totalSeasons: details.number_of_seasons || 0,
      creator: (details.created_by || []).map((c: any) => c.name).join(', '),
      actors: (details.credits?.cast || []).slice(0, 5).map((actor: any) => actor.name),
      genres: (details.genres || []).map((genre: any) => genre.name),
      status: 'non-vu',
      watchedEpisodes: 0,
      seasonLabel: details.number_of_seasons > 0 ? 'Saison 1' : '',
      updatedAt: new Date().toISOString()
    };
  }

  async onDirectProgressChange(value: string | number): Promise<void> {
    if (!this.media) return;

    const numericValue = Number(value);

    if (Number.isNaN(numericValue)) {
      return;
    }

    if (this.isFilm()) {
      const total = this.media.totalMinutes || this.media.duration || 0;
      this.media.watchedMinutes = Math.max(0, Math.min(total, numericValue));
      this.updateStatusFromFilmProgress(total);
    }

    if (this.isSeries()) {
      const total = this.media.totalEpisodes || 0;
      this.media.watchedEpisodes = Math.max(0, Math.min(total, numericValue));
      this.updateStatusFromSeriesProgress(total);
    }

    this.media.updatedAt = new Date().toISOString();
    await this.watchlistService.updateMedia(this.media);
  }
}
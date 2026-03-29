import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MediaItem, MediaStatus } from '../../models/media.model';
import { TmdbService } from '../../services/tmdb.service';
import { WatchlistService } from '../../services/watchlist';

@Component({
  selector: 'app-movie-detail',
  templateUrl: './movie-detail.page.html',
  styleUrls: ['./movie-detail.page.scss'],
  standalone: false
})
export class MovieDetailPage implements OnInit {
  readonly missingInfoText = 'Aucune information trouvée';

  media?: MediaItem;
  selectedSeason = '';
  seasonOptions: string[] = [];
  isSavedInWatchlist = false;

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
      this.redirectToDashboard();
      return;
    }

    try {
      const localMedia = this.watchlistService.getMediaById(id);
      this.isSavedInWatchlist = !!localMedia;

      const apiMedia = await this.loadApiMedia(id, typeParam);

      if (!apiMedia) {
        this.redirectToDashboard();
        return;
      }

      this.media = this.mergeApiAndLocalData(apiMedia, localMedia);
      this.buildSeasonOptions();
      this.selectedSeason = this.media.seasonLabel || this.seasonOptions[0] || '';

      if (!this.isSavedInWatchlist) {
        return;
      }

      if (this.isSeries()) {
        await this.loadSelectedSeasonEpisodeCount();
      } else {
        await this.persistMedia();
      }
    } catch (error) {
      console.error('Erreur chargement détails média :', error);
      this.redirectToDashboard();
    }
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }

    this.redirectToDashboard();
  }

  goToDashboard(): void {
    this.redirectToDashboard();
  }

  isSeries(): boolean {
    return this.media?.type === 'serie';
  }

  isFilm(): boolean {
    return this.media?.type === 'film';
  }

  canEditTracking(): boolean {
    return this.isSavedInWatchlist;
  }

  getActorsText(): string {
    return this.getJoinedTextOrFallback(this.media?.actors);
  }

  getGenresText(): string {
    return this.getJoinedTextOrFallback(this.media?.genres);
  }

  getCreatorText(): string {
    return this.getTextOrFallback(this.media?.creator);
  }

  getSynopsisText(): string {
    return this.getTextOrFallback(this.media?.synopsis);
  }

  getDurationText(): string {
    if (!this.media) {
      return this.missingInfoText;
    }

    const duration = this.isFilm()
      ? this.media.duration || this.media.totalMinutes || 0
      : this.media.episodeDuration || 0;

    if (duration <= 0) {
      return this.missingInfoText;
    }

    return this.isFilm()
      ? `${duration} minutes`
      : `${duration} minutes par épisode (moyenne)`;
  }

  async setStatus(status: MediaStatus): Promise<void> {
    if (!this.media || !this.canEditTracking()) {
      return;
    }

    this.media.status = status;
    this.applyStatusToProgress(status, this.getProgressTotal());
    await this.persistMedia();
  }

  async decreaseProgress(): Promise<void> {
    if (!this.canEditTracking()) {
      return;
    }

    await this.changeProgress(-1);
  }

  async increaseProgress(): Promise<void> {
    if (!this.canEditTracking()) {
      return;
    }

    await this.changeProgress(1);
  }

  async onSeasonChange(): Promise<void> {
    if (!this.media || !this.isSeries() || !this.canEditTracking()) {
      return;
    }

    this.media.seasonLabel = this.selectedSeason;
    this.media.watchedEpisodes = 0;
    await this.loadSelectedSeasonEpisodeCount();
  }

  async onDirectProgressChange(value: string | number): Promise<void> {
    if (!this.media || !this.canEditTracking()) {
      return;
    }

    const numericValue = Number(value);

    if (Number.isNaN(numericValue)) {
      return;
    }

    const total = this.getProgressTotal();
    this.setWatchedProgress(this.clampProgress(numericValue, total));
    this.updateStatusFromProgress(total);
    await this.persistMedia();
  }

  private async loadApiMedia(id: string, typeParam: string): Promise<MediaItem | null> {
    if (typeParam === 'movie') {
      const details = await firstValueFrom(this.tmdbService.getMovieDetails(id));
      return this.mapMovieDetailsToMediaItem(details);
    }

    if (typeParam === 'tv') {
      const details = await firstValueFrom(this.tmdbService.getTvDetails(id));
      return this.mapTvDetailsToMediaItem(details);
    }

    return null;
  }

  private redirectToDashboard(): void {
    this.router.navigate(['/tabs/dashboard']);
  }

  private async changeProgress(delta: number): Promise<void> {
    if (!this.media) {
      return;
    }

    const total = this.getProgressTotal();
    const nextValue = this.getWatchedProgress() + delta;

    this.setWatchedProgress(this.clampProgress(nextValue, total));
    this.updateStatusFromProgress(total);
    await this.persistMedia();
  }

  private getProgressTotal(): number {
    if (!this.media) {
      return 0;
    }

    return this.isFilm()
      ? this.media.totalMinutes || this.media.duration || 0
      : this.media.totalEpisodes || 0;
  }

  private getWatchedProgress(): number {
    if (!this.media) {
      return 0;
    }

    return this.isFilm()
      ? this.media.watchedMinutes || 0
      : this.media.watchedEpisodes || 0;
  }

  private setWatchedProgress(value: number): void {
    if (!this.media) {
      return;
    }

    if (this.isFilm()) {
      this.media.watchedMinutes = value;
      return;
    }

    this.media.watchedEpisodes = value;
  }

  private applyStatusToProgress(status: MediaStatus, total: number): void {
    if (status === 'vu') {
      this.setWatchedProgress(total);
      return;
    }

    if (status === 'non-vu') {
      this.setWatchedProgress(0);
      return;
    }

    const current = this.getWatchedProgress();

    if (current <= 0 && total > 0) {
      this.setWatchedProgress(1);
      return;
    }

    if (current >= total && total > 0) {
      this.setWatchedProgress(total - 1);
      return;
    }

    this.setWatchedProgress(current);
  }

  private updateStatusFromProgress(total: number): void {
    if (!this.media) {
      return;
    }

    const watched = this.getWatchedProgress();

    if (watched <= 0) {
      this.media.status = 'non-vu';
      return;
    }

    if (watched >= total) {
      this.media.status = 'vu';
      return;
    }

    this.media.status = 'en-cours';
  }

  private clampProgress(value: number, total: number): number {
    return Math.max(0, Math.min(total, value));
  }

  private async persistMedia(): Promise<void> {
    if (!this.media || !this.canEditTracking()) {
      return;
    }

    this.media.updatedAt = new Date().toISOString();
    await this.watchlistService.updateMedia(this.media);
  }

  private buildSeasonOptions(): void {
    const seasonCount = this.isSeries() ? this.media?.totalSeasons || 0 : 0;

    this.seasonOptions = Array.from(
      { length: seasonCount },
      (_, index) => `Saison ${index + 1}`
    );
  }

  private getSelectedSeasonNumber(): number {
    const match = this.selectedSeason.match(/\d+/);
    return match ? Number(match[0]) : 1;
  }

  private async loadSelectedSeasonEpisodeCount(): Promise<void> {
    if (!this.media || !this.isSeries() || !this.canEditTracking()) {
      return;
    }

    try {
      const seasonDetails = await firstValueFrom(
        this.tmdbService.getTvSeasonDetails(this.media.id, this.getSelectedSeasonNumber())
      );

      const episodeCount =
        seasonDetails.episodes?.length ||
        seasonDetails.episode_count ||
        0;

      const averageEpisodeDuration = this.calculateAverageDuration(
        (seasonDetails.episodes || []).map((episode: any) => episode.runtime)
      );

      this.media.totalEpisodes = episodeCount;

      if (averageEpisodeDuration > 0) {
        this.media.episodeDuration = averageEpisodeDuration;
      }

      this.setWatchedProgress(this.clampProgress(this.getWatchedProgress(), episodeCount));
      this.updateStatusFromProgress(episodeCount);
      await this.persistMedia();
    } catch (error) {
      console.error('Erreur chargement saison :', error);
    }
  }

  private mergeApiAndLocalData(apiMedia: MediaItem, localMedia?: MediaItem): MediaItem {
    if (!localMedia) {
      return {
        ...apiMedia,
        status: 'non-vu',
        watchedMinutes: 0,
        watchedEpisodes: 0,
        updatedAt: new Date().toISOString()
      };
    }

    return {
      ...apiMedia,
      status: localMedia.status,
      watchedMinutes: localMedia.watchedMinutes ?? 0,
      watchedEpisodes: localMedia.watchedEpisodes ?? 0,
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
        : '',
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
    const avgEpisodeDuration =
      this.calculateAverageDuration(details.episode_run_time) ||
      this.getRuntimeFallback(details);

    return {
      id: String(details.id),
      type: 'serie',
      title: details.name || 'Sans titre',
      poster: details.poster_path
        ? `https://image.tmdb.org/t/p/w500${details.poster_path}`
        : '',
      year: details.first_air_date ? new Date(details.first_air_date).getFullYear().toString() : '',
      synopsis: details.overview || '',
      episodeDuration: avgEpisodeDuration,
      totalEpisodes: details.number_of_episodes || 0,
      totalSeasons: details.number_of_seasons || 0,
      creator: this.extractSeriesCreator(details),
      actors: (details.credits?.cast || []).slice(0, 5).map((actor: any) => actor.name),
      genres: (details.genres || []).map((genre: any) => genre.name),
      status: 'non-vu',
      watchedEpisodes: 0,
      seasonLabel: details.number_of_seasons > 0 ? 'Saison 1' : '',
      updatedAt: new Date().toISOString()
    };
  }

  private getTextOrFallback(value?: string | null): string {
    return value?.trim() ? value : this.missingInfoText;
  }

  private getJoinedTextOrFallback(values?: string[]): string {
    const filteredValues = (values || [])
      .map(value => value?.trim())
      .filter((value): value is string => !!value);

    return filteredValues.length > 0
      ? filteredValues.join(', ')
      : this.missingInfoText;
  }

  private calculateAverageDuration(values?: unknown[]): number {
    const durations = (values || [])
      .map(value => Number(value))
      .filter(value => Number.isFinite(value) && value > 0);

    if (durations.length === 0) {
      return 0;
    }

    const total = durations.reduce((sum, value) => sum + value, 0);
    return Math.round(total / durations.length);
  }

  private getRuntimeFallback(details: any): number {
    const runtime = Number(
      details.last_episode_to_air?.runtime ||
      details.next_episode_to_air?.runtime ||
      0
    );

    return Number.isFinite(runtime) && runtime > 0 ? runtime : 0;
  }

  private extractSeriesCreator(details: any): string {
    const createdBy = (details.created_by || [])
      .map((creator: any) => creator.name?.trim())
      .filter((name: string | undefined): name is string => !!name);

    if (createdBy.length > 0) {
      return [...new Set(createdBy)].join(', ');
    }

    const crewCreators = (details.credits?.crew || [])
      .filter((person: any) => person.job === 'Creator')
      .map((person: any) => person.name?.trim())
      .filter((name: string | undefined): name is string => !!name);

    return [...new Set(crewCreators)].join(', ');
  }
}
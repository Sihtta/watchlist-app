import { Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MediaItem, MediaStatus } from '../../models/media.model';
import { TmdbMediaType } from '../../models/tmdb-search-result.model';
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

  // Charge le detail du media depuis la route
  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    const typeParam = this.route.snapshot.queryParamMap.get('type');

    if (!id) {
      this.redirectToDashboard();
      return;
    }

    try {
      const localMedia = this.watchlistService.getMediaById(id);
      const mediaType = this.resolveRouteMediaType(typeParam, localMedia);

      this.isSavedInWatchlist = Boolean(localMedia);

      if (localMedia?.source === 'manual') {
        this.media = this.buildManualMedia(localMedia);
        this.initializeSeasonState();
        this.applyManualSeasonData();
        return;
      }

      if (!mediaType) {
        this.redirectToDashboard();
        return;
      }

      const apiMedia = await this.loadApiMedia(id, mediaType);
      this.media = this.mergeApiAndLocalData(apiMedia, localMedia);
      this.initializeSeasonState();

      if (this.isSeries() && this.canEditTracking()) {
        await this.loadSelectedSeasonEpisodeCount();
      } else if (this.canEditTracking()) {
        await this.persistMedia();
      }
    } catch (error) {
      console.error('Erreur chargement détails média :', error);
      this.redirectToDashboard();
    }
  }

  // Revient a l'ecran precedent ou au dashboard
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

  // Indique si le media courant est une serie
  isSeries(): boolean {
    return this.media?.type === 'serie';
  }

  // Indique si le media courant est un film
  isFilm(): boolean {
    return this.media?.type === 'film';
  }

  // Autorise le suivi seulement pour les medias ajoutes
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

  // Retourne la duree a afficher
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
      : `${duration} minutes par épisode`;
  }

  // Met a jour le statut et la progression associee
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

  // Recharge la progression lors d'un changement de saison
  async onSeasonChange(): Promise<void> {
    if (!this.media || !this.isSeries() || !this.canEditTracking()) {
      return;
    }

    this.media.seasonLabel = this.selectedSeason;

    if (this.media.source === 'manual') {
      this.media.watchedEpisodes = 0;
      this.applyManualSeasonData();
      await this.persistMedia();
      return;
    }

    this.media.watchedEpisodes = 0;
    await this.loadSelectedSeasonEpisodeCount();
  }

  // Met a jour la progression saisie manuellement
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

  // Charge les details film ou serie depuis TMDB
  private async loadApiMedia(id: string, typeParam: TmdbMediaType): Promise<MediaItem> {
    if (typeParam === 'movie') {
      const details = await firstValueFrom(this.tmdbService.getMovieDetails(id));
      return this.mapMovieDetailsToMediaItem(details);
    }

    const details = await firstValueFrom(this.tmdbService.getTvDetails(id));
    return this.mapTvDetailsToMediaItem(details);
  }

  // Determine le type TMDB a partir de la route ou du media local
  private resolveRouteMediaType(
    typeParam: string | null,
    localMedia?: MediaItem
  ): TmdbMediaType | null {
    if (typeParam === 'movie' || typeParam === 'tv') {
      return typeParam;
    }

    if (localMedia?.type === 'film') {
      return 'movie';
    }

    if (localMedia?.type === 'serie') {
      return 'tv';
    }

    return null;
  }

  // Redirige vers le dashboard si le detail ne peut pas etre ouvert
  private redirectToDashboard(): void {
    this.router.navigate(['/tabs/dashboard']);
  }

  // Applique un changement de progression puis sauvegarde
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

  // Sauvegarde le suivi uniquement pour un media ajoute
  private async persistMedia(): Promise<void> {
    if (!this.media || !this.canEditTracking()) {
      return;
    }

    this.media.updatedAt = new Date().toISOString();
    await this.watchlistService.updateMedia(this.media);
  }

  // Initialise la saison courante et la liste disponible
  private initializeSeasonState(): void {
    this.buildSeasonOptions();
    this.selectedSeason = this.media?.seasonLabel || this.seasonOptions[0] || '';
  }

  // Construit les saisons disponibles pour une serie
  private buildSeasonOptions(): void {
    const seasonCount = this.isSeries() ? this.media?.totalSeasons || 0 : 0;

    this.seasonOptions = Array.from(
      { length: seasonCount },
      (_, index) => `Saison ${index + 1}`
    );
  }

  // Extrait le numero de la saison selectionnee
  private getSelectedSeasonNumber(): number {
    const match = this.selectedSeason.match(/\d+/);
    return match ? Number(match[0]) : 1;
  }

  // Charge les infos de la saison selectionnee
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

  // Fusionne les details TMDB avec le suivi local
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
      source: localMedia.source,
      status: localMedia.status,
      watchedMinutes: localMedia.watchedMinutes ?? 0,
      watchedEpisodes: localMedia.watchedEpisodes ?? 0,
      seasonLabel: localMedia.seasonLabel,
      updatedAt: localMedia.updatedAt
    };
  }

  private buildManualMedia(localMedia: MediaItem): MediaItem {
    return {
      ...localMedia,
      updatedAt: localMedia.updatedAt || new Date().toISOString(),
      watchedMinutes: localMedia.watchedMinutes ?? 0,
      watchedEpisodes: localMedia.watchedEpisodes ?? 0,
      seasonEpisodeCounts: localMedia.seasonEpisodeCounts || []
    };
  }

  // Applique le nombre d'episodes de la saison manuelle
  private applyManualSeasonData(): void {
    if (!this.media || !this.isSeries()) {
      return;
    }

    const seasonNumber = this.getSelectedSeasonNumber();
    const seasonEpisodeCounts = this.media.seasonEpisodeCounts || [];
    const selectedSeasonEpisodeCount = seasonEpisodeCounts[seasonNumber - 1];

    if (selectedSeasonEpisodeCount && selectedSeasonEpisodeCount > 0) {
      this.media.totalEpisodes = selectedSeasonEpisodeCount;
      return;
    }

    this.media.totalEpisodes = this.media.totalEpisodes || 0;
  }

  // Mappe les details film vers le modele interne
  private mapMovieDetailsToMediaItem(details: any): MediaItem {
    const director = details.credits?.crew?.find((person: any) => person.job === 'Director');

    return {
      id: String(details.id),
      type: 'film',
      source: 'tmdb',
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

  // Mappe les details serie vers le modele interne
  private mapTvDetailsToMediaItem(details: any): MediaItem {
    const avgEpisodeDuration =
      this.calculateAverageDuration(details.episode_run_time) ||
      this.getRuntimeFallback(details);

    return {
      id: String(details.id),
      type: 'serie',
      source: 'tmdb',
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

  // Calcule une duree moyenne a partir de plusieurs valeurs
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

  // Cherche une duree de secours pour les series
  private getRuntimeFallback(details: any): number {
    const runtime = Number(
      details.last_episode_to_air?.runtime ||
      details.next_episode_to_air?.runtime ||
      0
    );

    return Number.isFinite(runtime) && runtime > 0 ? runtime : 0;
  }

  // Recupere le createur principal d'une serie
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

import { Location } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MediaType } from '../../models/media.model';
import { WatchlistService } from '../../services/watchlist';

@Component({
  selector: 'app-add-media',
  templateUrl: './add-media.page.html',
  styleUrls: ['./add-media.page.scss'],
  standalone: false
})
export class AddMediaPage {
  title = '';
  type: MediaType = 'film';
  imageUrl = '';
  duration = 0;
  totalSeasons = 1;
  seasonEpisodeCounts: number[] = [0];

  errorMessage = '';

  constructor(
    private watchlistService: WatchlistService,
    private router: Router,
    private location: Location
  ) {}

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }

    this.router.navigate(['/tabs/search']);
  }

  isFilm(): boolean {
    return this.type === 'film';
  }

  isSeries(): boolean {
    return this.type === 'serie';
  }

  onTypeChange(type: MediaType): void {
    this.type = type;
    this.errorMessage = '';
  }

  onSeasonCountChange(value: string | number): void {
    const seasonCount = Math.max(1, Number(value) || 1);
    this.totalSeasons = seasonCount;

    this.seasonEpisodeCounts = Array.from(
      { length: seasonCount },
      (_, index) => this.seasonEpisodeCounts[index] || 0
    );
  }

  async submit(): Promise<void> {
    const cleanTitle = this.title.trim();
    const cleanImageUrl = this.imageUrl.trim();

    if (!cleanTitle) {
      this.errorMessage = 'Le nom est obligatoire.';
      return;
    }

    if (cleanImageUrl && !this.isValidUrl(cleanImageUrl)) {
      this.errorMessage = "L'URL de l'image n'est pas valide.";
      return;
    }

    if (this.isFilm() && this.duration <= 0) {
      this.errorMessage = 'La durée du film doit être supérieure à 0.';
      return;
    }

    if (this.isSeries()) {
      if (this.totalSeasons <= 0) {
        this.errorMessage = 'Le nombre de saisons doit être supérieur à 0.';
        return;
      }

      const hasInvalidEpisodeCount = this.seasonEpisodeCounts.some(count => Number(count) <= 0);

      if (hasInvalidEpisodeCount) {
        this.errorMessage = "Le nombre d'épisodes doit être supérieur à 0 pour chaque saison.";
        return;
      }
    }

    await this.watchlistService.addManualMedia({
      title: cleanTitle,
      type: this.type,
      imageUrl: cleanImageUrl,
      duration: this.isFilm() ? this.duration : undefined,
      totalSeasons: this.isSeries() ? this.totalSeasons : undefined,
      totalEpisodes: this.isSeries() ? this.seasonEpisodeCounts[0] : undefined,
      seasonEpisodeCounts: this.isSeries() ? this.seasonEpisodeCounts : undefined
    });

    this.router.navigate(['/tabs/search']);
  }

  private isValidUrl(value: string): boolean {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }
}
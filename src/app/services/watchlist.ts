import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { BehaviorSubject } from 'rxjs';
import { MediaItem } from '../models/media.model';
import { TmdbSearchResult } from '../models/tmdb-search-result.model';

export interface DashboardStats {
  inProgress: number;
  completed: number;
  series: number;
  films: number;
}

@Injectable({
  providedIn: 'root'
})
export class WatchlistService {
  private readonly STORAGE_KEY = 'watchlist_items';

  private mediaSubject = new BehaviorSubject<MediaItem[]>([]);
  media$ = this.mediaSubject.asObservable();

  constructor() {
    this.init();
  }

  // Charge la watchlist sauvegardee au demarrage de l'application.
  async init(): Promise<void> {
    const { value } = await Preferences.get({ key: this.STORAGE_KEY });

    if (!value) {
      this.mediaSubject.next([]);
      return;
    }

    try {
      const parsedItems: MediaItem[] = JSON.parse(value);
      this.mediaSubject.next(parsedItems);
    } catch (error) {
      console.error('Erreur lecture watchlist :', error);
      await this.setMediaItems([]);
    }
  }

  // Calcule les statistiques affichees sur le dashboard.
  getDashboardStats(): DashboardStats {
    const items = this.mediaSubject.value;

    return {
      inProgress: items.filter(item => item.status === 'en-cours').length,
      completed: items.filter(item => item.status === 'vu').length,
      series: items.filter(item => item.type === 'serie').length,
      films: items.filter(item => item.type === 'film').length
    };
  }

  // Retourne les medias les plus recents selon leur date de mise a jour.
  getRecentActivity(limit: number = 5): MediaItem[] {
    return [...this.mediaSubject.value]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, limit);
  }

  getMediaById(id: string): MediaItem | undefined {
    return this.mediaSubject.value.find(item => item.id === id);
  }

  getSeries(): MediaItem[] {
    return this.mediaSubject.value.filter(item => item.type === 'serie');
  }

  getFilms(): MediaItem[] {
    return this.mediaSubject.value.filter(item => item.type === 'film');
  }

  isSavedTmdbItem(item: TmdbSearchResult): boolean {
    return this.mediaSubject.value.some(
      media => media.id === String(item.id)
    );
  }

  // Supprime un media TMDB deja present dans la watchlist.
  async removeTmdbItem(item: TmdbSearchResult): Promise<void> {
    const updated = this.mediaSubject.value.filter(
      media => media.id !== String(item.id)
    );

    await this.setMediaItems(updated);
  }

  // Met a jour un media existant dans la watchlist.
  async updateMedia(updatedItem: MediaItem): Promise<void> {
    const updated = this.mediaSubject.value.map(item =>
      item.id === updatedItem.id ? updatedItem : item
    );

    await this.setMediaItems(updated);
  }

  hasData(): boolean {
    return this.mediaSubject.value.length > 0;
  }

  // Ajoute un nouveau media TMDB dans la watchlist locale.
  async addFromTmdb(result: {
    id: number;
    mediaType: 'movie' | 'tv';
    title: string;
    posterUrl: string | null;
    year: string;
  }): Promise<void> {
    const exists = this.mediaSubject.value.some(
      item => item.id === String(result.id)
    );

    if (exists) {
      return;
    }

    const newItem: MediaItem = {
      id: String(result.id),
      title: result.title,
      type: result.mediaType === 'movie' ? 'film' : 'serie',
      poster: result.posterUrl || undefined,
      year: result.year || undefined,
      status: 'non-vu',
      updatedAt: new Date().toISOString(),
      watchedMinutes: 0,
      watchedEpisodes: 0,
      totalMinutes: 0,
      totalEpisodes: 0,
      seasonLabel: result.mediaType === 'tv' ? 'Saison 1' : undefined
    };

    await this.setMediaItems([newItem, ...this.mediaSubject.value]);
  }

  // Met a jour l'etat local puis sauvegarde la watchlist.
  private async setMediaItems(items: MediaItem[]): Promise<void> {
    this.mediaSubject.next(items);
    await this.saveToStorage();
  }

  // Enregistre la watchlist dans le stockage local de l'application.
  private async saveToStorage(): Promise<void> {
    await Preferences.set({
      key: this.STORAGE_KEY,
      value: JSON.stringify(this.mediaSubject.value)
    });
  }
}

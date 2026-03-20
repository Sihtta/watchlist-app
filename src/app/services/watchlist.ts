import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Preferences } from '@capacitor/preferences';
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

  async init(): Promise<void> {
    const { value } = await Preferences.get({ key: this.STORAGE_KEY });

    if (!value) {
      this.mediaSubject.next([]);
      return;
    }

    try {
      const parsedItems: MediaItem[] = JSON.parse(value);
      const cleanedItems = this.removeLegacyMockItems(parsedItems);

      this.mediaSubject.next(cleanedItems);

      if (cleanedItems.length !== parsedItems.length) {
        await this.saveToStorage();
      }
    } catch (error) {
      console.error('Erreur lecture watchlist :', error);
      this.mediaSubject.next([]);
      await this.saveToStorage();
    }
  }

  getDashboardStats(): DashboardStats {
    const items = this.mediaSubject.value;

    return {
      inProgress: items.filter(item => item.status === 'en-cours').length,
      completed: items.filter(item => item.status === 'vu').length,
      series: items.filter(item => item.type === 'serie').length,
      films: items.filter(item => item.type === 'film').length
    };
  }

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

  async removeTmdbItem(item: TmdbSearchResult): Promise<void> {
    const updated = this.mediaSubject.value.filter(
      media => media.id !== String(item.id)
    );

    this.mediaSubject.next(updated);
    await this.saveToStorage();
  }

  async updateMedia(updatedItem: MediaItem): Promise<void> {
    const updated = this.mediaSubject.value.map(item =>
      item.id === updatedItem.id ? updatedItem : item
    );

    this.mediaSubject.next(updated);
    await this.saveToStorage();
  }

  hasData(): boolean {
    return this.mediaSubject.value.length > 0;
  }

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

    const updated = [newItem, ...this.mediaSubject.value];
    this.mediaSubject.next(updated);
    await this.saveToStorage();
  }

  private removeLegacyMockItems(items: MediaItem[]): MediaItem[] {
    return items.filter(item => {
      const isLegacyMockPoster = item.poster?.startsWith('assets/mock/');
      const isLegacyMockTitle =
        item.title === 'Star Wars V - L’Empire contre-attaque' ||
        item.title === 'Breaking Bad';

      return !isLegacyMockPoster && !isLegacyMockTitle;
    });
  }

  private async saveToStorage(): Promise<void> {
    await Preferences.set({
      key: this.STORAGE_KEY,
      value: JSON.stringify(this.mediaSubject.value)
    });
  }
}
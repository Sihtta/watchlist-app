import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';
import { BehaviorSubject } from 'rxjs';
import { MediaItem, MediaType } from '../models/media.model';
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
  private readonly storageKey = 'watchlist_items';

  private readonly mediaSubject = new BehaviorSubject<MediaItem[]>([]);
  readonly media$ = this.mediaSubject.asObservable();

  constructor() {
    this.init();
  }

  async init(): Promise<void> {
    const { value } = await Preferences.get({ key: this.storageKey });

    if (!value) {
      this.mediaSubject.next([]);
      return;
    }

    try {
      const items: MediaItem[] = JSON.parse(value);
      this.mediaSubject.next(items);
    } catch (error) {
      console.error('Erreur lecture watchlist :', error);
      await this.setMediaItems([]);
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

  getFilms(): MediaItem[] {
    return this.getMediaByType('film');
  }

  getSeries(): MediaItem[] {
    return this.getMediaByType('serie');
  }

  getMediaByType(type: MediaType): MediaItem[] {
    return this.mediaSubject.value.filter(item => item.type === type);
  }

  hasData(): boolean {
    return this.mediaSubject.value.length > 0;
  }

  isSavedTmdbItem(item: TmdbSearchResult): boolean {
    return this.hasMediaId(String(item.id));
  }

  async removeTmdbItem(item: TmdbSearchResult): Promise<void> {
    await this.removeById(String(item.id));
  }

  async removeById(id: string): Promise<void> {
    const updatedItems = this.mediaSubject.value.filter(item => item.id !== id);
    await this.setMediaItems(updatedItems);
  }

  async updateMedia(updatedItem: MediaItem): Promise<void> {
    const updatedItems = this.mediaSubject.value.map(item =>
      item.id === updatedItem.id ? updatedItem : item
    );

    await this.setMediaItems(updatedItems);
  }

  async addFromTmdb(
    result: Pick<TmdbSearchResult, 'id' | 'mediaType' | 'title' | 'posterUrl' | 'year'>
  ): Promise<void> {
    const id = String(result.id);

    if (this.hasMediaId(id)) {
      return;
    }

    const newItem: MediaItem = {
      id,
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

  private hasMediaId(id: string): boolean {
    return this.mediaSubject.value.some(item => item.id === id);
  }

  private async setMediaItems(items: MediaItem[]): Promise<void> {
    this.mediaSubject.next(items);
    await this.saveToStorage(items);
  }

  private async saveToStorage(items: MediaItem[]): Promise<void> {
    await Preferences.set({
      key: this.storageKey,
      value: JSON.stringify(items)
    });
  }
}
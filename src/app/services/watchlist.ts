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

export interface ManualMediaInput {
  title: string;
  type: MediaType;
  imageUrl?: string;
  duration?: number;
  totalSeasons?: number;
  totalEpisodes?: number;
  seasonEpisodeCounts?: number[];
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

  // Charge la watchlist depuis le stockage
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

  // Retourne les chiffres a afficher sur le dashboard
  getDashboardStats(): DashboardStats {
    const items = this.mediaSubject.value;

    return {
      inProgress: items.filter(item => item.status === 'en-cours').length,
      completed: items.filter(item => item.status === 'vu').length,
      series: items.filter(item => item.type === 'serie').length,
      films: items.filter(item => item.type === 'film').length
    };
  }

  // Retourne les medias les plus recents
  getRecentActivity(limit: number = 5): MediaItem[] {
    return [...this.mediaSubject.value]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, limit);
  }

  // Recherche un media par son identifiant
  getMediaById(id: string): MediaItem | undefined {
    return this.mediaSubject.value.find(item => item.id === id);
  }

  getFilms(): MediaItem[] {
    return this.getMediaByType('film');
  }

  getSeries(): MediaItem[] {
    return this.getMediaByType('serie');
  }

  // Filtre la liste par type de media
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

  // Remplace un media existant par sa version mise a jour
  async updateMedia(updatedItem: MediaItem): Promise<void> {
    const updatedItems = this.mediaSubject.value.map(item =>
      item.id === updatedItem.id ? updatedItem : item
    );

    await this.setMediaItems(updatedItems);
  }

  // Ajoute un media TMDB avec un suivi minimal
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
      source: 'tmdb',
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

  // Ajoute un media manuel avec ses infos de base
  async addManualMedia(input: ManualMediaInput): Promise<void> {
    const newItem: MediaItem = {
      id: this.buildManualId(),
      title: input.title.trim(),
      type: input.type,
      source: 'manual',
      poster: input.imageUrl?.trim() || undefined,
      status: 'non-vu',
      updatedAt: new Date().toISOString(),
      watchedMinutes: 0,
      watchedEpisodes: 0
    };

    if (input.type === 'film') {
      newItem.duration = input.duration || 0;
      newItem.totalMinutes = input.duration || 0;
    } else {
      const seasonEpisodeCounts = (input.seasonEpisodeCounts || []).map(count => Number(count) || 0);

      newItem.totalSeasons = input.totalSeasons || 1;
      newItem.seasonEpisodeCounts = seasonEpisodeCounts;
      newItem.totalEpisodes = seasonEpisodeCounts[0] || input.totalEpisodes || 0;
      newItem.seasonLabel = 'Saison 1';
    }

    await this.setMediaItems([newItem, ...this.mediaSubject.value]);
  }

  // Verifie si un identifiant existe deja dans la liste
  private hasMediaId(id: string): boolean {
    return this.mediaSubject.value.some(item => item.id === id);
  }

  // Genere un identifiant unique pour un media manuel
  private buildManualId(): string {
    return `manual-${Date.now()}`;
  }

  // Met a jour l'etat local puis persiste la liste
  private async setMediaItems(items: MediaItem[]): Promise<void> {
    this.mediaSubject.next(items);
    await this.saveToStorage(items);
  }

  // Enregistre la watchlist dans le stockage Capacitor
  private async saveToStorage(items: MediaItem[]): Promise<void> {
    await Preferences.set({
      key: this.storageKey,
      value: JSON.stringify(items)
    });
  }
}

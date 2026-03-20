import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Preferences } from '@capacitor/preferences';
import { MediaItem } from '../models/media.model';

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

  if (value) {
    this.mediaSubject.next(JSON.parse(value));
    } else {
      const mockData: MediaItem[] = [
        {
          id: '1',
          title: 'Star Wars V - L’Empire contre-attaque',
          type: 'film',
          year: 1980,
          poster: 'assets/mock/starwars5.jpg',
          status: 'en-cours',
          updatedAt: new Date().toISOString(),
          duration: 124,
          totalMinutes: 124,
          watchedMinutes: 88,
          creator: 'Irvin Kershner',
          actors: [
            'Mark Hamill',
            'Harrison Ford',
            'Carrie Fisher',
            'David Prowse',
            'Billy Dee Williams',
            'Anthony Daniels'
          ],
          genres: ['Science-fiction', 'Action'],
          synopsis: 'Traqués par l’Empire...'
        },
        {
          id: '2',
          title: 'Breaking Bad',
          type: 'serie',
          year: 2008,
          poster: 'assets/mock/breakingbad.jpg',
          status: 'en-cours',
          updatedAt: new Date().toISOString(),
          seasonLabel: 'Saison 3',
          progressLabel: 'Épisode 7 / 12',
          episodeDuration: 50,
          totalEpisodes: 12,
          watchedEpisodes: 7,
          creator: 'Vince Gilligan',
          actors: [
            'Bryan Cranston',
            'Aaron Paul',
            'Anna Gunn',
            'Dean Norris',
            'Bob Odenkirk'
          ],
          genres: ['Drame', 'Thriller'],
          synopsis: 'Atteint d’un cancer...'
        }
      ];

      this.mediaSubject.next(mockData);

      await Preferences.set({
        key: this.STORAGE_KEY,
        value: JSON.stringify(mockData)
      });
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

  async updateMedia(updatedItem: MediaItem): Promise<void> {
    const updated = this.mediaSubject.value.map(item =>
      item.id === updatedItem.id ? updatedItem : item
    );

    this.mediaSubject.next(updated);
    await Preferences.set({
      key: this.STORAGE_KEY,
      value: JSON.stringify(updated)
    });
  }

  hasData(): boolean {
      return this.mediaSubject.value.length > 0;
    }

    addFromTmdb(result: {
    id: number;
    mediaType: 'movie' | 'tv';
    title: string;
    posterUrl: string | null;
    year: string;
  }): void {
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
      year: result.year ? Number(result.year) : undefined,
      status: 'non-vu',
      updatedAt: new Date().toISOString(),
      watchedMinutes: 0,
      watchedEpisodes: 0
    };

    const updated = [newItem, ...this.mediaSubject.value];
    this.mediaSubject.next(updated);

    Preferences.set({
      key: this.STORAGE_KEY,
      value: JSON.stringify(updated)
    });
  }

  private async saveToStorage(): Promise<void> {
    await Preferences.set({
      key: this.STORAGE_KEY,
      value: JSON.stringify(this.mediaSubject.value)
    });
  }
}
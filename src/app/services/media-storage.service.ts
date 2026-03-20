import { Injectable } from '@angular/core';
import { TmdbSearchResult } from '../models/tmdb-search-result.model';

export interface StoredMedia {
  id: number;
  title: string;
  posterUrl: string | null;
  rating: number;
  year: string;
  type: 'movie' | 'tv';
}

@Injectable({
  providedIn: 'root'
})
export class MediaStorageService {
  private storageKey = 'my_media';

  getAll(): StoredMedia[] {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : [];
  }

  saveAll(list: StoredMedia[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(list));
  }

  add(item: TmdbSearchResult): void {
    const current = this.getAll();

    const exists = current.find(
      m => m.id === item.id && m.type === item.mediaType
    );

    if (exists) return;

    const newItem: StoredMedia = {
      id: item.id,
      title: item.title,
      posterUrl: item.posterUrl,
      rating: item.rating,
      year: item.year,
      type: item.mediaType
    };

    current.push(newItem);
    this.saveAll(current);
  }

  getMovies(): StoredMedia[] {
    return this.getAll().filter(m => m.type === 'movie');
  }

  getSeries(): StoredMedia[] {
    return this.getAll().filter(m => m.type === 'tv');
  }

  isSaved(item: TmdbSearchResult): boolean {
    return this.getAll().some(
      m => m.id === item.id && m.type === item.mediaType
    );
  }
}
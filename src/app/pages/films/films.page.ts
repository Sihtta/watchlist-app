import { Component, OnInit } from '@angular/core';
import { MediaStorageService, StoredMedia } from '../../services/media-storage.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-movies',
  templateUrl: './films.page.html',
  standalone: false,
  styleUrls: ['./films.page.scss']
})
export class FilmsPage implements OnInit {
  movies: StoredMedia[] = [];

  constructor(
    private storage: MediaStorageService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.load();
  }

  ionViewWillEnter(): void {
    this.load();
  }

  load(): void {
    this.movies = this.storage.getMovies();
  }

  goToSearch(): void {
    this.router.navigate(['/tabs/search']);
  }
}
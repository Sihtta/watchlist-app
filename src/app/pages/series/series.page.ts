import { Component, OnInit } from '@angular/core';
import { MediaStorageService, StoredMedia } from '../../services/media-storage.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-series',
  templateUrl: './series.page.html',
  standalone: false,
  styleUrls: ['./series.page.scss']
})
export class SeriesPage implements OnInit {
  series: StoredMedia[] = [];

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
    this.series = this.storage.getSeries();
  }

  goToSearch(): void {
    this.router.navigate(['/tabs/search']);
  }
}
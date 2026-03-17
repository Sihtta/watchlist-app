import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MediaItem } from '../../models/media.model';
import { WatchlistService } from '../../services/watchlist';

interface StatCard {
  label: string;
  value: number;
  icon: string;
  colorClass: string;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.page.html',
  styleUrls: ['./dashboard.page.scss'],
  standalone: false
})
export class DashboardPage implements OnInit {

  stats: StatCard[] = [];
  recentItems: MediaItem[] = [];
  hasData = true;

  constructor(
    private watchlistService: WatchlistService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.refreshDashboard();

    this.watchlistService.media$.subscribe(() => {
      this.refreshDashboard();
    });
  }

  private refreshDashboard(): void {
    const dashboardStats = this.watchlistService.getDashboardStats();
    this.recentItems = this.watchlistService.getRecentActivity(5);
    this.hasData = this.watchlistService.hasData();

    this.stats = [
      { label: 'En cours', value: dashboardStats.inProgress, icon: 'play-outline', colorClass: 'blue' },
      { label: 'Terminés', value: dashboardStats.completed, icon: 'checkmark-circle-outline', colorClass: 'green' },
      { label: 'Séries', value: dashboardStats.series, icon: 'tv-outline', colorClass: 'purple' },
      { label: 'Films', value: dashboardStats.films, icon: 'videocam-outline', colorClass: 'orange' }
    ];
  }

  goToSearch(): void {
    this.router.navigate(['/tabs/search']);
  }

  goToDetail(id: string): void {
    this.router.navigate(['/movie-detail', id]);
  }
}
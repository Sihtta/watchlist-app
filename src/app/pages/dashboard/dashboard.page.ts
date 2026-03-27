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

  // Initialise les donnees du dashboard et lance leur mise a jour.
  ngOnInit(): void {
    this.refreshDashboard();

    this.watchlistService.media$.subscribe(() => {
      this.refreshDashboard();
    });
  }

  // Met a jour les donnees affichees sur le dashboard.
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

  // Ouvre la page detail du media selectionne.
  goToDetail(item: MediaItem): void {
    const tmdbType = item.type === 'film' ? 'movie' : 'tv';

    this.router.navigate(['/movie-detail', item.id], {
      queryParams: { type: tmdbType }
    });
  }

  // Retourne le libelle de statut a afficher pour le media.
  getStatusLabel(item: MediaItem): string {
    if (item.status === 'en-cours') {
      return 'En cours';
    }

    if (item.status === 'vu') {
      return 'Vu';
    }

    return 'Non vu';
  }

  // Retourne le sous-titre a afficher sous le titre du media.
  getSubtitle(item: MediaItem): string {
    if (item.type === 'serie' && item.seasonLabel) {
      return item.seasonLabel;
    }

    return item.type === 'film' ? 'Film' : 'Série';
  }

  // Retourne le texte de progression a afficher pour le media.
  getProgressLabel(item: MediaItem): string {
    if (item.type === 'serie' && item.totalEpisodes) {
      return `Épisode ${item.watchedEpisodes || 0} / ${item.totalEpisodes}`;
    }

    if (item.type === 'film' && item.totalMinutes) {
      return `${item.watchedMinutes || 0} / ${item.totalMinutes} min`;
    }

    return '';
  }
}

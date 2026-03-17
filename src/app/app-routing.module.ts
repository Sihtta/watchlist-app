import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./tabs/tabs.module').then(m => m.TabsPageModule)
  },
  {
    path: 'dashboard',
    loadChildren: () => import('./pages/dashboard/dashboard.module').then( m => m.DashboardPageModule)
  },
  {
    path: 'movie-detail',
    loadChildren: () => import('./pages/movie-detail/movie-detail.module').then( m => m.MovieDetailPageModule)
  },
  {
    path: 'series',
    loadChildren: () => import('./pages/series/series.module').then( m => m.SeriesPageModule)
  },
  {
    path: 'films',
    loadChildren: () => import('./pages/films/films.module').then( m => m.FilmsPageModule)
  },
  {
    path: 'search',
    loadChildren: () => import('./pages/search/search.module').then( m => m.SearchPageModule)
  },
  {
    path: 'films',
    loadChildren: () => import('./pages/films/films.module').then( m => m.FilmsPageModule)
  },
  {
    path: 'series',
    loadChildren: () => import('./pages/series/series.module').then( m => m.SeriesPageModule)
  },
  {
    path: 'search',
    loadChildren: () => import('./pages/search/search.module').then( m => m.SearchPageModule)
  },
  {
    path: 'movie-detail',
    loadChildren: () => import('./pages/movie-detail/movie-detail.module').then( m => m.MovieDetailPageModule)
  }
];
@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}

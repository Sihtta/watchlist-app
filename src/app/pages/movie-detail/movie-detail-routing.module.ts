import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { MovieDetailPage } from './movie-detail.page';

const routes: Routes = [
  {
    path: ':id',
    component: MovieDetailPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class MovieDetailPageRoutingModule {}
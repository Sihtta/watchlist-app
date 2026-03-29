import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AddMediaPage } from './add-media.page';

const routes: Routes = [
  {
    path: '',
    component: AddMediaPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AddMediaPageRoutingModule {}
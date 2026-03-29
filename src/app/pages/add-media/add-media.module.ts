import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { AddMediaPageRoutingModule } from './add-media-routing.module';
import { AddMediaPage } from './add-media.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    AddMediaPageRoutingModule
  ],
  declarations: [AddMediaPage]
})
export class AddMediaPageModule {}
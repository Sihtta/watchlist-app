import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddMediaPage } from './add-media.page';

describe('AddMediaPage', () => {
  let component: AddMediaPage;
  let fixture: ComponentFixture<AddMediaPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AddMediaPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

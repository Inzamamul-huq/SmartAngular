import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Joblist } from './joblist';

describe('Joblist', () => {
  let component: Joblist;
  let fixture: ComponentFixture<Joblist>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Joblist]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Joblist);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

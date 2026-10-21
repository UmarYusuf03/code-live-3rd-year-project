import { bootstrapApplication } from '@angular/platform-browser';
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, Routes, withComponentInputBinding } from '@angular/router';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LandingComponent } from './app/components/landing/landing.component';
import { RoomComponent } from './app/components/room/room.component';

const routes: Routes = [
  { path: '', component: LandingComponent },
  { path: 'room/:id', component: RoomComponent },
  { path: '**', redirectTo: '' },
];

const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
  ],
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet></router-outlet>',
})
export class AppComponent {}

bootstrapApplication(AppComponent, appConfig).catch((err) => console.error(err));

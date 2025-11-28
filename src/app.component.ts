import { Component, ChangeDetectionStrategy, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlantAnalyzerComponent, PlantAnalysisEvent } from './components/plant-analyzer/plant-analyzer.component';
import { AuthService, User } from './services/auth.service';
import { DataService } from './services/data.service';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlantAnalyzerComponent, CommonModule, LoginComponent, RegisterComponent]
})
export class AppComponent {
  private authService = inject(AuthService);
  private dataService = inject(DataService);

  currentUser = this.authService.currentUser;
  
  // App view state: 'home', 'login', 'register', 'analyzer', 'history'
  view = signal<'home' | 'login' | 'register' | 'analyzer' | 'history'>('home');
  analyzerMode = signal<'upload' | 'live'>('upload');
  history = signal<PlantAnalysisEvent[]>([]);

  constructor() {
    // Effect to react to user login/logout
    effect(() => {
      const user = this.currentUser();
      if (user) {
        // User is logged in, load their history
        this.history.set(this.dataService.getHistory(user.id));
        // If they were on login/register page, move them home
        if (this.view() === 'login' || this.view() === 'register') {
          this.view.set('home');
        }
      } else {
        // User logged out, clear history and go home
        this.history.set([]);
        if (this.view() !== 'login' && this.view() !== 'register') {
          this.view.set('home');
        }
      }
    });
  }

  // --- View Navigation Methods ---

  showView(viewName: 'home' | 'login' | 'register' | 'analyzer' | 'history'): void {
    if ((viewName === 'history' || viewName === 'analyzer') && !this.currentUser()) {
        this.view.set('login'); // Redirect to login if not authenticated
    } else {
        this.view.set(viewName);
    }
  }

  selectAnalyzerMode(mode: 'upload' | 'live'): void {
    if (!this.currentUser()) {
      this.view.set('login'); // Force login before using analyzer
      return;
    }
    this.analyzerMode.set(mode);
    this.view.set('analyzer');
  }

  addAnalysisToHistory(analysis: PlantAnalysisEvent): void {
    const user = this.currentUser();
    if (user) {
      const updatedHistory = [analysis, ...this.history()];
      this.history.set(updatedHistory);
      this.dataService.saveHistory(user.id, updatedHistory);
    }
  }

  logout(): void {
    this.authService.logout();
  }
}

import { Component, ChangeDetectionStrategy, signal, inject, effect, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlantAnalyzerComponent, PlantAnalysisEvent } from './components/plant-analyzer/plant-analyzer.component';
import { AuthService, User } from './services/auth.service';
import { DataService } from './services/data.service';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { NotificationService } from './services/notification.service';
import { HelpWidgetComponent } from './components/help-widget/help-widget.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlantAnalyzerComponent, CommonModule, LoginComponent, RegisterComponent, DashboardComponent, HelpWidgetComponent]
})
export class AppComponent {
  private authService = inject(AuthService);
  private dataService = inject(DataService);
  notificationService = inject(NotificationService);

  currentUser = this.authService.currentUser;
  
  // App view state: 'home', 'login', 'register', 'analyzer', 'history', 'dashboard'
  view = signal<'home' | 'login' | 'register' | 'analyzer' | 'history' | 'dashboard'>('home');
  analyzerMode = signal<'upload' | 'live'>('upload');
  history = signal<PlantAnalysisEvent[]>([]);
  isMenuOpen = signal(false);
  isLogOpen = signal(false);
  isSearchOpen = signal(false);
  searchTerm = signal('');

  // --- Searchable Actions ---
  private searchableActions = [
    {
      name: 'Dashboard',
      description: 'View stats and recent activity',
      icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V7a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      keywords: ['dashboard', 'stats', 'home', 'main'],
      action: () => this.showView('dashboard')
    },
    {
      name: 'View History',
      description: 'Browse all past analyses',
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      keywords: ['history', 'past', 'log', 'analyses'],
      action: () => this.showView('history')
    },
    {
      name: 'Upload Image',
      description: 'Analyze a plant photo from your device',
      icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12',
      keywords: ['upload', 'photo', 'image', 'analyze', 'camera'],
      action: () => this.selectAnalyzerMode('upload')
    },
    {
      name: 'Farm Connect',
      description: 'Connect to a live sensor feed',
      icon: 'M12 18h.01M8.465 14.535a5.975 5.975 0 018.07 0M5.636 11.606a10.475 10.475 0 0112.728 0M2.808 8.677a15.025 15.025 0 0118.384 0',
      keywords: ['live', 'sensor', 'farm connect', 'monitoring'],
      action: () => this.selectAnalyzerMode('live')
    },
    {
      name: 'Logout',
      description: 'Sign out of your account',
      icon: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
      keywords: ['logout', 'sign out', 'exit', 'leave'],
      action: () => this.logout()
    }
  ];

  searchResults = computed(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const actions = this.searchableActions.filter(a => this.currentUser() ? true : a.name !== 'Logout');
    if (!term) return actions;

    return actions.filter(action => {
      const inName = action.name.toLowerCase().includes(term);
      const inKeywords = action.keywords.some(k => k.includes(term));
      return inName || inKeywords;
    });
  });


  constructor() {
    // Effect to react to user login/logout
    effect(() => {
      const user = this.currentUser();
      if (user) {
        this.history.set(this.dataService.getHistory(user.id));
        if (this.view() === 'login' || this.view() === 'register') {
          this.view.set('home');
        }
      } else {
        this.history.set([]);
        if (this.view() !== 'login' && this.view() !== 'register') {
          this.view.set('home');
        }
      }
    });
  }

  // --- View Navigation Methods ---

  showView(viewName: 'home' | 'login' | 'register' | 'analyzer' | 'history' | 'dashboard'): void {
    if ((viewName === 'history' || viewName === 'analyzer' || viewName === 'dashboard') && !this.currentUser()) {
        this.view.set('login');
    } else {
        this.view.set(viewName);
    }
    this.isMenuOpen.set(false);
  }

  selectAnalyzerMode(mode: 'upload' | 'live'): void {
    if (!this.currentUser()) {
      this.view.set('login');
      return;
    }
    this.analyzerMode.set(mode);
    this.view.set('analyzer');
  }

  addAnalysisToHistory(analysis: PlantAnalysisEvent): void {
    const user = this.currentUser();
    if (user) {
      const historyItem: PlantAnalysisEvent = { ...analysis, image: analysis.image };
      const updatedHistory = [historyItem, ...this.history()];
      this.history.set(updatedHistory);
      this.dataService.saveHistory(user.id, updatedHistory);
    }
  }

  logout(): void {
    this.authService.logout();
    this.isMenuOpen.set(false);
  }

  toggleMenu(): void {
    this.isMenuOpen.update(v => !v);
  }

  // --- Log and Search Methods ---

  toggleLog(open?: boolean): void {
    const shouldOpen = open ?? !this.isLogOpen();
    this.isLogOpen.set(shouldOpen);
    if (shouldOpen) {
      this.notificationService.markAllAsRead();
    }
  }

  toggleSearch(open?: boolean): void {
    const shouldOpen = open ?? !this.isSearchOpen();
    this.isSearchOpen.set(shouldOpen);
    if (!shouldOpen) {
      this.searchTerm.set('');
    } else {
        // Auto-focus the input when opening
        setTimeout(() => document.querySelector<HTMLInputElement>('#feature-search-input')?.focus(), 0);
    }
  }

  executeSearchAction(action: () => void): void {
    action();
    this.toggleSearch(false);
  }

  getRelativeTime(date: Date): string {
    const now = new Date();
    const seconds = Math.round((now.getTime() - date.getTime()) / 1000);
    const minutes = Math.round(seconds / 60);
    const hours = Math.round(minutes / 60);
    const days = Math.round(hours / 24);

    if (seconds < 5) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }
}

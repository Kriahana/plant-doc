import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlantAnalyzerComponent, PlantAnalysisEvent } from './components/plant-analyzer/plant-analyzer.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlantAnalyzerComponent, CommonModule]
})
export class AppComponent {
  selectedMode = signal<'none' | 'upload' | 'live'>('none');
  showHistory = signal(false);
  history = signal<PlantAnalysisEvent[]>([]);

  selectMode(mode: 'upload' | 'live'): void {
    this.selectedMode.set(mode);
    this.showHistory.set(false); // Hide history when entering a mode
  }

  resetMode(): void {
    this.selectedMode.set('none');
    this.showHistory.set(false);
  }

  toggleHistory(): void {
    this.showHistory.update(value => !value);
    if (this.showHistory()) {
        this.selectedMode.set('none'); // Ensure we are not in a mode when viewing history
    }
  }

  addAnalysisToHistory(analysis: PlantAnalysisEvent): void {
    this.history.update(currentHistory => [analysis, ...currentHistory]);
  }
}

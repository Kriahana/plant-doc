
import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { PlantAnalyzerComponent } from './components/plant-analyzer/plant-analyzer.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PlantAnalyzerComponent]
})
export class AppComponent {
  selectedMode = signal<'none' | 'upload' | 'live'>('none');

  selectMode(mode: 'upload' | 'live'): void {
    this.selectedMode.set(mode);
  }

  resetMode(): void {
    this.selectedMode.set('none');
  }
}

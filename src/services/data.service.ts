import { Injectable } from '@angular/core';
import { PlantAnalysisEvent } from '../components/plant-analyzer/plant-analyzer.component';

@Injectable({ providedIn: 'root' })
export class DataService {
  getHistory(userId: string): PlantAnalysisEvent[] {
    const historyJson = localStorage.getItem(`history_${userId}`);
    return historyJson ? JSON.parse(historyJson) : [];
  }

  saveHistory(userId: string, history: PlantAnalysisEvent[]): void {
    localStorage.setItem(`history_${userId}`, JSON.stringify(history));
  }
}

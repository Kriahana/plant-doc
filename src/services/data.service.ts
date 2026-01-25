import { Injectable } from '@angular/core';
import { PlantAnalysisEvent } from '../components/plant-analyzer/plant-analyzer.component';

@Injectable({ providedIn: 'root' })
export class DataService {
  /**
   * Retrieves the analysis history for a specific user from local storage.
   * Includes error handling for safer JSON parsing.
   * @param userId The ID of the user whose history is to be retrieved.
   * @returns An array of PlantAnalysisEvent objects, or an empty array if none exists or an error occurs.
   */
  getHistory(userId: string): PlantAnalysisEvent[] {
    try {
      const historyJson = localStorage.getItem(`history_${userId}`);
      if (historyJson) {
        const parsedData = JSON.parse(historyJson);
        // Ensure the parsed data is an array before returning
        return Array.isArray(parsedData) ? parsedData : [];
      }
      return [];
    } catch (error) {
      console.error('Failed to read or parse history from localStorage:', error);
      // Return an empty array to prevent the app from crashing on corrupted data
      return [];
    }
  }

  /**
   * Saves the analysis history for a specific user to local storage.
   * Includes error handling in case storage fails (e.g., storage is full).
   * @param userId The ID of the user whose history is to be saved.
   * @param history The array of PlantAnalysisEvent objects to save.
   */
  saveHistory(userId: string, history: PlantAnalysisEvent[]): void {
    try {
      localStorage.setItem(`history_${userId}`, JSON.stringify(history));
    } catch (error) {
      console.error('Failed to save history to localStorage:', error);
      // This can happen if storage is full. In a real app, you might notify the user.
    }
  }
}

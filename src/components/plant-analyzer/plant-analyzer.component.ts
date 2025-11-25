
import { Component, ChangeDetectionStrategy, input, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeminiService, AnalysisResult } from '../../services/gemini.service';

@Component({
  selector: 'plant-analyzer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './plant-analyzer.component.html',
  styleUrls: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlantAnalyzerComponent {
  mode = input.required<'upload' | 'live'>();
  
  private geminiService = inject(GeminiService);

  // UI State
  isLoading = signal(false);
  error = signal<string | null>(null);
  
  // Data State
  imageBase64 = signal<string | null>(null);
  analysisResult = signal<AnalysisResult | null>(null);

  // Mock state for 'live' mode
  isConnecting = signal(false);
  isConnected = signal(false);


  onFileSelected(event: Event): void {
    const element = event.currentTarget as HTMLInputElement;
    const fileList: FileList | null = element.files;

    if (fileList && fileList[0]) {
      const file = fileList[0];
      this.resetState();
      this.isLoading.set(true); // Start loading as soon as file is selected
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const base64String = e.target.result.split(',')[1];
        this.imageBase64.set(e.target.result); // Full data URL for display
        this.isLoading.set(false); // Stop loading after processing
        this.analyzeImage(base64String);
      };
      reader.onerror = () => {
        this.isLoading.set(false);
        this.error.set('Could not read the selected file.');
      };
      reader.readAsDataURL(file);
    }
  }

  async analyzeImage(base64String: string): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    this.analysisResult.set(null);

    try {
      const result = await this.geminiService.analyzePlantImage(base64String);
      this.analysisResult.set(result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      this.error.set(errorMessage);
    } finally {
      this.isLoading.set(false);
    }
  }
  
  // Mock function for 'live' mode
  connectToDevice(): void {
    this.resetState();
    this.isConnecting.set(true);
    setTimeout(() => {
      this.isConnecting.set(false);
      this.isConnected.set(true);
      // Use a placeholder image for analysis in mock mode
      this.imageBase64.set('https://picsum.photos/seed/plant/600/400');
      // Simulate fetching image and then analyzing
       fetch('https://picsum.photos/seed/plant/600/400')
        .then(res => res.blob())
        .then(blob => {
          const reader = new FileReader();
          reader.onload = (e: any) => {
             const base64String = e.target.result.split(',')[1];
             this.analyzeImage(base64String);
          }
          reader.readAsDataURL(blob);
        });
    }, 2500);
  }

  resetState(): void {
    this.isLoading.set(false);
    this.error.set(null);
    this.imageBase64.set(null);
    this.analysisResult.set(null);
    this.isConnecting.set(false);
    this.isConnected.set(false);
  }

  triggerFileUpload(): void {
    document.getElementById('file-upload-input')?.click();
  }
}

import { Component, ChangeDetectionStrategy, input, signal, inject, output, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeminiService, AnalysisResult } from '../../services/gemini.service';

export interface PlantAnalysisEvent {
  result: AnalysisResult;
  image: string;
  timestamp: Date;
}

export interface SensorData {
  temperature: number;
  humidity: number;
  light: number;
}

@Component({
  selector: 'plant-analyzer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './plant-analyzer.component.html',
  styleUrls: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlantAnalyzerComponent implements OnDestroy {
  mode = input.required<'upload' | 'live'>();
  newAnalysis = output<PlantAnalysisEvent>();
  
  private geminiService = inject(GeminiService);

  // UI State
  isLoading = signal(false);
  isAnalyzing = signal(false); // For live mode background analysis
  error = signal<string | null>(null);
  
  // Data State
  imageBase64 = signal<string | null>(null);
  analysisResult = signal<AnalysisResult | null>(null);

  // State for 'live' mode
  isConnecting = signal(false);
  isConnected = signal(false);
  latestSensorData = signal<SensorData | null>(null);
  private liveMonitoringInterval = signal<any>(null);


  onFileSelected(event: Event): void {
    const element = event.currentTarget as HTMLInputElement;
    const fileList: FileList | null = element.files;

    if (fileList && fileList[0]) {
      const file = fileList[0];
      this.resetState();
      this.isLoading.set(true);
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const base64String = e.target.result.split(',')[1];
        const imageUrl = e.target.result;
        this.imageBase64.set(imageUrl); 
        this.isLoading.set(false);
        this.analyzeImage(base64String, imageUrl);
      };
      reader.onerror = () => {
        this.isLoading.set(false);
        this.error.set('Could not read the selected file.');
      };
      reader.readAsDataURL(file);
    }
  }

  async analyzeImage(base64String: string, imageUrl: string): Promise<void> {
    if (this.mode() === 'upload') {
        this.isLoading.set(true);
        this.analysisResult.set(null);
    } else {
        this.isAnalyzing.set(true);
    }
    this.error.set(null);

    try {
      const result = await this.geminiService.analyzePlantImage(base64String);
      this.analysisResult.set(result);
      this.newAnalysis.emit({ result, image: imageUrl, timestamp: new Date() });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      this.error.set(errorMessage);
    } finally {
      this.isLoading.set(false);
      this.isAnalyzing.set(false);
    }
  }
  
  // --- Live Mode Methods ---

  connectToDevice(): void {
    this.resetState();
    this.isConnecting.set(true);
    setTimeout(() => {
      this.isConnecting.set(false);
      this.isConnected.set(true);
      this.startLiveMonitoring();
    }, 2500);
  }

  startLiveMonitoring(): void {
    this.captureAndAnalyze(); // Analyze immediately on connect
    const interval = setInterval(() => {
        this.captureAndAnalyze();
    }, 15000); // Capture and analyze every 15 seconds
    this.liveMonitoringInterval.set(interval);
  }

  async captureAndAnalyze(): Promise<void> {
    // Simulate fetching sensor data
    this.updateSensorData();

    // Simulate capturing an image
    const imageUrl = `https://picsum.photos/600/400?random=${Date.now()}`;
    this.imageBase64.set(imageUrl); // Update image for live feed

    try {
        const res = await fetch(imageUrl);
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onload = (e: any) => {
            const base64String = e.target.result.split(',')[1];
            this.analyzeImage(base64String, imageUrl);
        }
        reader.onerror = () => {
            this.error.set('Failed to process captured image.');
            this.isAnalyzing.set(false);
        }
        reader.readAsDataURL(blob);
    } catch (err) {
        this.error.set('Failed to capture image from live feed.');
        this.isAnalyzing.set(false);
    }
  }

  updateSensorData(): void {
    const data: SensorData = {
      temperature: parseFloat((20 + Math.random() * 5).toFixed(1)), // 20-25 °C
      humidity: Math.floor(50 + Math.random() * 20), // 50-70%
      light: Math.floor(10000 + Math.random() * 5000) // 10k-15k lux
    };
    this.latestSensorData.set(data);
  }

  stopMonitoring(): void {
    if (this.liveMonitoringInterval()) {
        clearInterval(this.liveMonitoringInterval()!);
        this.liveMonitoringInterval.set(null);
    }
    this.resetState();
  }

  ngOnDestroy(): void {
    this.stopMonitoring();
  }

  resetState(): void {
    this.isLoading.set(false);
    this.isAnalyzing.set(false);
    this.error.set(null);
    this.imageBase64.set(null);
    this.analysisResult.set(null);
    this.isConnecting.set(false);
    this.isConnected.set(false);
    this.latestSensorData.set(null);
  }

  triggerFileUpload(): void {
    document.getElementById('file-upload-input')?.click();
  }
}
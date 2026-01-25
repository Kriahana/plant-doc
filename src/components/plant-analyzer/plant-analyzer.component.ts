import { Component, ChangeDetectionStrategy, input, signal, inject, output, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GeminiService, AnalysisResult } from '../../services/gemini.service';
import { NotificationService } from '../../services/notification.service';

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

export interface AnalysisQueueItem {
  id: string;
  file: File;
  imageUrl: string; // Preview URL from createObjectURL
  status: 'pending' | 'analyzing' | 'completed' | 'error';
  progress?: number;
  result?: AnalysisResult;
  errorMessage?: string;
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
  private notificationService = inject(NotificationService);

  // --- State for 'upload' mode ---
  analysisQueue = signal<AnalysisQueueItem[]>([]);
  isProcessingQueue = signal(false);
  private activeProgressInterval = signal<any>(null);

  // --- State for 'live' mode ---
  isConnecting = signal(false);
  isConnected = signal(false);
  isAnalyzing = signal(false); // For live mode background analysis
  error = signal<string | null>(null);
  imageBase64 = signal<string | null>(null);
  analysisResult = signal<AnalysisResult | null>(null);
  latestSensorData = signal<SensorData | null>(null);
  private liveMonitoringInterval = signal<any>(null);


  // --- Upload Mode Methods ---

  onFileSelected(event: Event): void {
    const element = event.currentTarget as HTMLInputElement;
    const fileList: FileList | null = element.files;

    if (fileList && fileList.length > 0) {
      const newItems: AnalysisQueueItem[] = Array.from(fileList).map(file => ({
        id: `${Date.now()}-${Math.random()}`,
        file,
        imageUrl: URL.createObjectURL(file), // Create a temporary URL for preview
        status: 'pending'
      }));

      this.analysisQueue.update(currentQueue => [...currentQueue, ...newItems]);
      
      this.processQueue(); // Kick off processing if not already running
    }
  }

  async processQueue(): Promise<void> {
    if (this.isProcessingQueue()) return;

    this.isProcessingQueue.set(true);
    let nextItemIndex = this.analysisQueue().findIndex(item => item.status === 'pending');

    while (nextItemIndex !== -1) {
      this.analysisQueue.update(queue => {
          const item = queue[nextItemIndex];
          item.status = 'analyzing';
          item.progress = 0;
          return [...queue];
      });

      const itemToProcess = this.analysisQueue()[nextItemIndex];
      
      // Start Progress Simulation
      const progressInterval = setInterval(() => {
        this.analysisQueue.update(queue => {
          const item = queue.find(i => i.id === itemToProcess.id);
          if (item && item.status === 'analyzing' && item.progress !== undefined) {
            const currentProgress = item.progress;
            // Increment progress, but don't let it reach 100% until it's actually done.
            const increment = currentProgress < 70 ? Math.random() * 8 : Math.random() * 2;
            item.progress = Math.min(currentProgress + increment, 98); // Cap at 98%
          }
          return [...queue];
        });
      }, 400);
      this.activeProgressInterval.set(progressInterval);

      this.notificationService.addNotification(`Analyzing image: ${itemToProcess.file.name}`, 'info');

      try {
        const base64 = await this.readFileAsBase64(itemToProcess.file);
        const result = await this.geminiService.analyzePlantImage(base64);

        clearInterval(this.activeProgressInterval());
        this.activeProgressInterval.set(null);

        this.analysisQueue.update(queue => {
            const item = queue.find(i => i.id === itemToProcess.id);
            if (item) {
               item.status = 'completed';
               item.result = result;
               item.progress = 100;
            }
            return [...queue];
        });
        this.newAnalysis.emit({ result, image: itemToProcess.imageUrl, timestamp: new Date() });
        this.notificationService.addNotification(`Analysis complete for ${itemToProcess.file.name}.`, 'success');
      } catch (err) {
        clearInterval(this.activeProgressInterval());
        this.activeProgressInterval.set(null);
        
        const friendlyErrorMessage = this.getFriendlyErrorMessage(err);
        this.notificationService.addNotification(`Analysis failed for ${itemToProcess.file.name}.`, 'error');
         this.analysisQueue.update(queue => {
            const item = queue.find(i => i.id === itemToProcess.id);
            if (item) {
                item.status = 'error';
                item.errorMessage = friendlyErrorMessage;
                item.progress = 0;
            }
            return [...queue];
        });
      }
      
      nextItemIndex = this.analysisQueue().findIndex(item => item.status === 'pending');
    }

    this.isProcessingQueue.set(false);
  }

  private readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e: any) => {
            const base64String = e.target.result.split(',')[1];
            resolve(base64String);
        };
        reader.onerror = (error) => reject(new Error('Could not read the selected file.'));
        reader.readAsDataURL(file);
    });
  }

  retryItem(itemToRetry: AnalysisQueueItem): void {
    this.analysisQueue.update(queue => {
        const item = queue.find(i => i.id === itemToRetry.id);
        if (item && item.status === 'error') {
            item.status = 'pending';
            item.errorMessage = undefined;
            item.progress = 0;
        }
        return [...queue];
    });
    this.processQueue();
  }

  clearQueue(): void {
    if (this.activeProgressInterval()) {
      clearInterval(this.activeProgressInterval());
      this.activeProgressInterval.set(null);
    }
    const itemCount = this.analysisQueue().length;
    this.analysisQueue().forEach(item => URL.revokeObjectURL(item.imageUrl));
    this.analysisQueue.set([]);
    this.isProcessingQueue.set(false);
    if(itemCount > 0) {
      this.notificationService.addNotification('Analysis queue has been cleared.', 'info');
    }
  }
  
  // --- Live Mode Methods ---

  connectToDevice(): void {
    this.resetState();
    this.isConnecting.set(true);
    this.notificationService.addNotification('Connecting to farm sensor...', 'info');
    setTimeout(() => {
      this.isConnecting.set(false);
      this.isConnected.set(true);
      this.notificationService.addNotification('Successfully connected to farm sensor.', 'success');
      this.startLiveMonitoring();
    }, 2500);
  }

  startLiveMonitoring(): void {
    this.captureAndAnalyze();
    const interval = setInterval(() => this.captureAndAnalyze(), 15000);
    this.liveMonitoringInterval.set(interval);
  }

  async captureAndAnalyze(): Promise<void> {
    this.updateSensorData();
    const imageUrl = `https://picsum.photos/600/400?random=${Date.now()}`;
    this.imageBase64.set(imageUrl);
    this.isAnalyzing.set(true);
    this.error.set(null);
    this.notificationService.addNotification('Capturing new image for live analysis.', 'info');

    try {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onload = async (e: any) => {
        try {
          const base64String = e.target.result.split(',')[1];
          const result = await this.geminiService.analyzePlantImage(base64String);
          this.analysisResult.set(result);
          this.newAnalysis.emit({ result, image: imageUrl, timestamp: new Date() });
          this.notificationService.addNotification(`Live analysis complete: ${result.issueName}.`, 'success');
        } catch (err) {
          const message = this.getFriendlyErrorMessage(err);
          this.error.set(message);
          this.notificationService.addNotification(message, 'error');
        } finally {
          this.isAnalyzing.set(false);
        }
      }
      reader.onerror = () => {
        const message = 'Image Read Error: Failed to process the captured image from the live feed. The data might be corrupted.';
        this.error.set(message);
        this.notificationService.addNotification(message, 'error');
        this.isAnalyzing.set(false);
      }
      reader.readAsDataURL(blob);
    } catch (err)
      {
      const message = 'Network Error: Failed to download the image from the live feed. Please check your internet connection.';
      this.error.set(message);
      this.notificationService.addNotification(message, 'error');
      this.isAnalyzing.set(false);
    }
  }

  updateSensorData(): void {
    const data: SensorData = {
      temperature: parseFloat((20 + Math.random() * 5).toFixed(1)),
      humidity: Math.floor(50 + Math.random() * 20),
      light: Math.floor(10000 + Math.random() * 5000)
    };
    this.latestSensorData.set(data);
  }

  stopMonitoring(): void {
    if (this.liveMonitoringInterval()) {
        clearInterval(this.liveMonitoringInterval()!);
        this.liveMonitoringInterval.set(null);
        this.notificationService.addNotification('Live monitoring stopped.', 'info');
    }
    this.resetState();
  }

  // --- Component Lifecycle & General Methods ---

  ngOnDestroy(): void {
    this.stopMonitoring();
    this.clearQueue();
  }

  private getFriendlyErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('offline')) {
            return 'Network Offline: Please check your internet connection and try again.';
        }
        if (msg.includes('could not read the selected file')) {
            return 'File Error: The image could not be read. It might be corrupted. Please try a different file.';
        }
        if (msg.includes('empty response')) {
            return 'AI Error: The model returned an empty response. This can happen with unusual images. Please try again or use a different photo.';
        }
        if (msg.includes('invalid response format')) {
            return 'AI Error: The model returned data in an unexpected format. This is often a temporary issue. Please try again.';
        }
        if (msg.includes('failed to analyze')) {
            return 'Connection Error: Could not reach the AI model. Please check your internet connection and try again.';
        }
        return error.message;
    }
    return 'An unknown error occurred. Please try again.';
  }

  resetState(): void {
    this.clearQueue();
    this.isAnalyzing.set(false);
    this.error.set(null);
    this.imageBase64.set(null);
    this.analysisResult.set(null);
    this.isConnecting.set(false);
    this.isConnected.set(false);
    this.latestSensorData.set(null);
    
    if (this.liveMonitoringInterval()) {
        clearInterval(this.liveMonitoringInterval()!);
        this.liveMonitoringInterval.set(null);
    }
  }

  triggerFileUpload(): void {
    document.getElementById('file-upload-input')?.click();
  }
}
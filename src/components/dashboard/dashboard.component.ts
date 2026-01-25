import { Component, ChangeDetectionStrategy, input, computed, inject, signal, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlantAnalysisEvent } from '../plant-analyzer/plant-analyzer.component';
import { HttpClient } from '@angular/common/http';
import { NotificationService } from '../../services/notification.service';

interface Issue {
  name: string;
  count: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements OnInit {
  history = input.required<PlantAnalysisEvent[]>();
  
  private http = inject(HttpClient);
  private notificationService = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);

  // --- Environmental Sensor State ---
  sensorStatus = signal<'idle' | 'loading' | 'success' | 'error'>('idle');
  sensorError = signal<string | null>(null);
  environmentData = signal<{ temperature: number | null; humidity: number | null; light: number | null; } | null>(null);


  // --- Computed Stats from History ---
  totalAnalyses = computed(() => this.history().length);
  healthyCount = computed(() => this.history().filter(h => h.result.isHealthy).length);
  unhealthyCount = computed(() => this.totalAnalyses() - this.healthyCount());
  
  recentAnalysis = computed(() => this.history().length > 0 ? this.history()[0] : null);

  issueDistribution = computed<Issue[]>(() => {
    const issuesMap = new Map<string, number>();
    
    this.history()
      .filter(item => !item.result.isHealthy && item.result.issueName !== 'Invalid Image')
      .forEach(item => {
        const count = issuesMap.get(item.result.issueName) || 0;
        issuesMap.set(item.result.issueName, count + 1);
      });
      
    return Array.from(issuesMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  });

  maxIssueCount = computed(() => {
    const counts = this.issueDistribution().map(issue => issue.count);
    return Math.max(...counts, 1); // Avoid division by zero
  });

  plantDistribution = computed<Issue[]>(() => {
    const plantsMap = new Map<string, number>();
    this.history()
      .filter(item => item.result.plantName !== 'Unknown Plant' && item.result.plantName !== 'Invalid Image')
      .forEach(item => {
        const count = plantsMap.get(item.result.plantName) || 0;
        plantsMap.set(item.result.plantName, count + 1);
      });
      
    return Array.from(plantsMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  });

  maxPlantCount = computed(() => {
    const counts = this.plantDistribution().map(plant => plant.count);
    return Math.max(...counts, 1); // Avoid division by zero
  });

  ngOnInit(): void {
    this.loadEnvironmentalData();
  }

  loadEnvironmentalData(): void {
    this.sensorStatus.set('loading');
    this.sensorError.set(null);

    const weatherPromise = this.getWeatherData();
    const lightPromise = this.getLightData();

    Promise.allSettled([weatherPromise, lightPromise]).then(([weatherResult, lightResult]) => {
      const data = {
        temperature: null as number | null,
        humidity: null as number | null,
        light: null as number | null,
      };

      let hasSuccess = false;
      let errors: string[] = [];

      if (weatherResult.status === 'fulfilled') {
        data.temperature = weatherResult.value.temperature;
        data.humidity = weatherResult.value.humidity;
        hasSuccess = true;
      } else {
        errors.push(weatherResult.reason);
      }

      if (lightResult.status === 'fulfilled') {
        data.light = lightResult.value;
        if (lightResult.value !== null) hasSuccess = true;
      } else {
        errors.push(lightResult.reason);
      }
      
      if (hasSuccess) {
        this.environmentData.set(data);
        this.sensorStatus.set('success');
        if (errors.length > 0) {
            this.notificationService.addNotification(`Could not fetch all sensor data: ${errors.join(', ')}`, 'info');
        }
      } else {
        this.sensorError.set(errors.join(' '));
        this.sensorStatus.set('error');
      }
      this.cdr.detectChanges();
    });
  }

  private getWeatherData(): Promise<{temperature: number, humidity: number}> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject('Geolocation is not supported by your browser.');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m`;
          
          this.http.get<any>(url).subscribe({
            next: (data) => {
              if (data && data.current) {
                resolve({
                  temperature: Math.round(data.current.temperature_2m),
                  humidity: data.current.relative_humidity_2m
                });
              } else {
                reject('Invalid weather data format received.');
              }
            },
            error: () => {
              reject('Failed to fetch local weather data.');
            }
          });
        },
        () => {
          reject('Geolocation permission denied. Cannot fetch local weather.');
        },
        { timeout: 10000 }
      );
    });
  }

  private getLightData(): Promise<number | null> {
    return new Promise((resolve, reject) => {
      const LightSensor = (window as any).AmbientLightSensor;
      if (!LightSensor) {
        resolve(null); // Not supported, not an error.
        return;
      }

      try {
        const sensor = new LightSensor({frequency: 1});
        sensor.onreading = () => {
          resolve(Math.round(sensor.illuminance));
          sensor.stop();
        };
        sensor.onerror = (event: any) => {
          if (event.error.name === 'NotAllowedError') {
            resolve(null); // Permission denied, not an error.
          } else {
            reject(`Light sensor error: ${event.error.name}.`);
          }
           sensor.stop();
        };
        sensor.start();
      } catch (err) {
        reject('Could not initialize light sensor.');
      }
    });
  }
}
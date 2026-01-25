import { Injectable, signal, computed } from '@angular/core';

export type NotificationType = 'success' | 'error' | 'info';

export interface Notification {
  id: number;
  message: string;
  type: NotificationType;
  timestamp: Date;
  read: boolean;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private nextId = 0;
  notifications = signal<Notification[]>([]);

  unreadCount = computed(() => this.notifications().filter(n => !n.read).length);

  addNotification(message: string, type: NotificationType): void {
    const newNotification: Notification = {
      id: this.nextId++,
      message,
      type,
      timestamp: new Date(),
      read: false,
    };
    // Add to the beginning of the array and keep a max of 50 notifications
    this.notifications.update(current => [newNotification, ...current].slice(0, 50));
  }
  
  markAllAsRead(): void {
    this.notifications.update(current => 
      current.map(n => ({ ...n, read: true }))
    );
  }

  clearNotifications(): void {
    this.notifications.set([]);
  }
}
import { Injectable, signal, inject } from '@angular/core';
import { NotificationService } from './notification.service';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Only used for registration, not stored in session
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  currentUser = signal<User | null>(null);
  private notificationService = inject(NotificationService);

  constructor() {
    const usersJson = localStorage.getItem('users');
    let users: User[] = usersJson ? JSON.parse(usersJson) : [];
    
    // Create dummy user if not exists for easy testing
    if (!users.find(u => u.email === 'user')) {
        users.push({ id: this.generateId(), name: 'Test User', email: 'user', password: 'password123' });
    }
    
    // Create admin user if not exists for easy testing
    if (!users.find(u => u.email === 'admin')) {
        users.push({ id: this.generateId(), name: 'Admin User', email: 'admin', password: 'admin123' });
    }

    localStorage.setItem('users', JSON.stringify(users));
    
    // Check for a logged-in user from a previous session
    const currentUserJson = localStorage.getItem('currentUser');
    if (currentUserJson) {
      this.currentUser.set(JSON.parse(currentUserJson));
    }
  }

  login(email: string, password: string):boolean {
    const users = this.getUsers();
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
      const { password: _, ...userToStore } = user; // Exclude password from session data
      this.currentUser.set(userToStore);
      localStorage.setItem('currentUser', JSON.stringify(userToStore));
      this.notificationService.addNotification(`Welcome back, ${user.name}!`, 'success');
      return true;
    }
    return false;
  }

  register(name: string, email: string, password: string): { success: boolean, message?: string } {
    const users = this.getUsers();
    if (users.some(u => u.email === email)) {
      return { success: false, message: 'An account with this email already exists.' };
    }
    const newUser: User = { id: this.generateId(), name, email, password };
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    
    // Automatically log in the new user
    const { password: _, ...userToStore } = newUser;
    this.currentUser.set(userToStore);
    localStorage.setItem('currentUser', JSON.stringify(userToStore));
    this.notificationService.addNotification(`Welcome, ${newUser.name}! Your account is ready.`, 'success');

    return { success: true };
  }

  logout(): void {
    const user = this.currentUser();
    this.currentUser.set(null);
    localStorage.removeItem('currentUser');
    if (user) {
      this.notificationService.addNotification('You have been logged out.', 'info');
    }
  }

  private getUsers(): User[] {
    const usersJson = localStorage.getItem('users');
    return usersJson ? JSON.parse(usersJson) : [];
  }
  
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}
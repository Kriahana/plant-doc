import { Component, ChangeDetectionStrategy, output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
  loginSuccess = output<void>();
  goToRegister = output<void>();

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  
  error = signal<string | null>(null);

  loginForm = this.fb.group({
    email: ['', [Validators.required]],
    password: ['', Validators.required]
  });

  onSubmit(): void {
    this.error.set(null);
    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;
      const success = this.authService.login(email!, password!);
      if (success) {
        this.loginSuccess.emit();
      } else {
        this.error.set('Invalid email or password. Please try again.');
      }
    }
  }

  onGoToRegister(): void {
    this.goToRegister.emit();
  }
}

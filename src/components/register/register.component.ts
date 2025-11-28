import { Component, ChangeDetectionStrategy, output, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './register.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RegisterComponent {
  registerSuccess = output<void>();
  goToLogin = output<void>();

  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  
  error = signal<string | null>(null);

  registerForm = this.fb.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  onSubmit(): void {
    this.error.set(null);
    if (this.registerForm.valid) {
      const { name, email, password } = this.registerForm.value;
      const result = this.authService.register(name!, email!, password!);
      if (result.success) {
        this.registerSuccess.emit();
      } else {
        this.error.set(result.message || 'An unknown error occurred during registration.');
      }
    }
  }

  onGoToLogin(): void {
    this.goToLogin.emit();
  }
}

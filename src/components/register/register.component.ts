import { Component, ChangeDetectionStrategy, output, inject, signal } from '@angular/core';
// FIX: Import FormGroup and FormControl instead of FormBuilder.
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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

  private authService = inject(AuthService);
  
  error = signal<string | null>(null);

  // FIX: Instantiate FormGroup and FormControl directly to avoid issues with FormBuilder injection in this environment.
  registerForm = new FormGroup({
    name: new FormControl('', [Validators.required]),
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)])
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

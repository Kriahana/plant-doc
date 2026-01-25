import { Component, ChangeDetectionStrategy, output, inject, signal } from '@angular/core';
// FIX: Import FormGroup and FormControl instead of FormBuilder.
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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

  private authService = inject(AuthService);
  
  error = signal<string | null>(null);

  // FIX: Instantiate FormGroup and FormControl directly to avoid issues with FormBuilder injection in this environment.
  loginForm = new FormGroup({
    email: new FormControl('', [Validators.required]),
    password: new FormControl('', [Validators.required])
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

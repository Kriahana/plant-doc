import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-help-widget',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './help-widget.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HelpWidgetComponent {
  private notificationService = inject(NotificationService);

  isModalOpen = signal(false);
  isSubmitting = signal(false);
  submissionSuccess = signal(false);

  helpForm = new FormGroup({
    subject: new FormControl('General Question', [Validators.required]),
    message: new FormControl('', [Validators.required, Validators.minLength(10)])
  });

  toggleModal(open?: boolean): void {
    const shouldOpen = open ?? !this.isModalOpen();
    this.isModalOpen.set(shouldOpen);
    if (!shouldOpen) {
      // Reset state when closing manually
      this.closeAndReset();
    }
  }

  onSubmit(): void {
    if (this.helpForm.invalid) {
      return;
    }

    this.isSubmitting.set(true);
    this.helpForm.disable();

    // Simulate network request
    setTimeout(() => {
      this.isSubmitting.set(false);
      this.submissionSuccess.set(true);
      this.notificationService.addNotification('Support request sent successfully!', 'success');
    }, 1500);
  }

  closeAndReset(): void {
    this.isModalOpen.set(false);
    this.submissionSuccess.set(false);
    this.helpForm.reset({
        subject: 'General Question',
        message: ''
    });
    this.helpForm.enable();
  }
}

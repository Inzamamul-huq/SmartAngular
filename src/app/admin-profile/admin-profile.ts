import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-admin-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './admin-profile.html',
  styleUrls: ['./admin-profile.css']
})
export class AdminProfile {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);

  loading = false;
  success: string | null = null;
  error: string | null = null;

  
  showCurrent = false;
  showNew = false;
  showConfirm = false;

  form = this.fb.group({
    current_password: ['', [Validators.required, Validators.minLength(6)]],
    new_password: ['', [Validators.required, Validators.minLength(6)]],
    confirm_new_password: ['', [Validators.required, Validators.minLength(6)]],
  });

  get f() { return this.form.controls; }

  submit() {
    this.success = null;
    this.error = null;
    if (this.form.invalid) {
      this.error = 'Please fill all fields correctly';
      return;
    }

    const { current_password, new_password, confirm_new_password } = this.form.value;
    if (new_password !== confirm_new_password) {
      this.error = 'New passwords do not match';
      return;
    }

    this.loading = true;
    this.http.post('https://smartrecruit-9ofm.onrender.com/api/admin/change-password/', {
      current_password,
      new_password,
      confirm_new_password
    }).subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res?.status === 'Password updated successfully') {
          this.success = 'Password updated successfully';
          this.form.reset();
        } else {
          this.error = res?.error || 'Failed to update password';
        }
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.error = err.error?.error || err.error?.detail || 'Failed to update password';
      }
    });
  }
}

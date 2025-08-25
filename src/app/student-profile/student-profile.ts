import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpClient, HttpErrorResponse, HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-student-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, HttpClientModule],
  templateUrl: './student-profile.html',
  styleUrls: ['./student-profile.css']
})
export class StudentProfile implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);

  
  private baseUrl = 'https://smartrecruit-9ofm.onrender.com/api';

  
  loadingProfile = false;
  savingProfile = false;
  changingPassword = false;
  uploadingResume = false;

  profileSuccess: string | null = null;
  profileError: string | null = null;
  passwordSuccess: string | null = null;
  passwordError: string | null = null;
  resumeSuccess: string | null = null;
  resumeError: string | null = null;

  
  showCurrent = false;
  showNew = false;
  showConfirm = false;

  studentId: number | null = null;
  resumeUrl: string | null = null;

  profileForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9+\-() ]{7,20}$/)]],
  });

  passwordForm = this.fb.group({
    current_password: ['', [Validators.required, Validators.minLength(6)]],
    new_password: ['', [Validators.required, Validators.minLength(6)]],
    confirm_new_password: ['', [Validators.required, Validators.minLength(6)]],
  });

  ngOnInit(): void {
    this.fetchProfile();
  }

  fetchProfile() {
    this.loadingProfile = true;
    this.profileError = null;
    this.http.get<any>(`${this.baseUrl}/student/profile/`).subscribe({
      next: (res) => {
        this.loadingProfile = false;
        this.studentId = res?.id ?? null;
        this.resumeUrl = res?.resume ? `https://smartrecruit-9ofm.onrender.com${res.resume}` : null;
        this.profileForm.patchValue({
          name: res?.name || '',
          phone: res?.phone || '',
        });
      },
      error: (err: HttpErrorResponse) => {
        this.loadingProfile = false;
        this.profileError = err.error?.error || err.error?.detail || 'Failed to load profile';
      }
    });
  }

  saveProfile() {
    this.profileSuccess = null;
    this.profileError = null;
    if (this.profileForm.invalid) {
      this.profileError = 'Please provide valid name and phone';
      return;
    }
    this.savingProfile = true;
    this.http.patch(`${this.baseUrl}/student/profile/`, this.profileForm.value).subscribe({
      next: (res: any) => {
        this.savingProfile = false;
        this.profileSuccess = 'Profile updated';
      },
      error: (err: HttpErrorResponse) => {
        this.savingProfile = false;
        this.profileError = err.error?.error || 'Failed to update profile';
      }
    });
  }

  changePassword() {
    this.passwordSuccess = null;
    this.passwordError = null;
    if (this.passwordForm.invalid) {
      this.passwordError = 'Fill all password fields correctly';
      return;
    }
    const { new_password, confirm_new_password } = this.passwordForm.value;
    if (new_password !== confirm_new_password) {
      this.passwordError = 'New passwords do not match';
      return;
    }
    this.changingPassword = true;
    this.http.post(`${this.baseUrl}/student/change-password/`, this.passwordForm.value).subscribe({
      next: (res: any) => {
        this.changingPassword = false;
        if (res?.status === 'Password updated successfully') {
          this.passwordSuccess = 'Password updated successfully';
          this.passwordForm.reset();
          this.showCurrent = this.showNew = this.showConfirm = false;
        } else {
          this.passwordError = res?.error || 'Failed to update password';
        }
      },
      error: (err: HttpErrorResponse) => {
        this.changingPassword = false;
        this.passwordError = err.error?.error || err.error?.detail || 'Failed to update password';
      }
    });
  }

  onResumeSelected(evt: Event) {
    const input = evt.target as HTMLInputElement;
    const file = input?.files && input.files[0];
    if (!file) return;
    if (!this.studentId) {
      this.resumeError = 'Missing student id';
      return;
    }
    const fd = new FormData();
    fd.append('resume', file);
    this.resumeSuccess = null;
    this.resumeError = null;
    this.uploadingResume = true;
    this.http.post(`${this.baseUrl}/student/upload-resume/${this.studentId}/`, fd).subscribe({
      next: (res: any) => {
        this.uploadingResume = false;
        this.resumeSuccess = 'Resume uploaded';
        this.fetchProfile();
      },
      error: (err: HttpErrorResponse) => {
        this.uploadingResume = false;
        this.resumeError = err.error?.error || 'Failed to upload resume';
      }
    });
  }
}

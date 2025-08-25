import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { StorageService } from '../services/storage.service';

@Component({
  selector: 'app-verify-otp',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, HttpClientModule],
  templateUrl: './verify-otp.component.html',
  styleUrls: ['./verify-otp.component.css']
})
export class VerifyOtpComponent implements OnInit {
  otpForm: FormGroup;
  loading = false;
  error: string | null = null;
  email: string | null = null;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private storageService: StorageService
  ) {
    this.otpForm = this.fb.group({
      otp: ['', [Validators.required, Validators.pattern('^[0-9]{6}$')]]
    });
  }

  ngOnInit() {
    this.email = this.storageService.getItem('resetEmail');
    if (!this.email) {
      this.router.navigate(['/forgot-password']);
    }
  }

  onSubmit() {
    if (this.otpForm.invalid || !this.email) {
      return;
    }

    this.loading = true;
    this.error = null;

    const otp = this.otpForm.get('otp')?.value;
    

    this.storageService.setItem('otp', otp);
    
    
    this.http.post('https://smartrecruit-l27g.onrender.com/api/student/verify-otp/', {
      email: this.email,
      otp: otp
    }, { withCredentials: true }).subscribe({
      next: () => {
        this.router.navigate(['/reset-password']);
      },
      error: (error) => {
        this.loading = false;
        this.error = error.error?.status || 'Invalid OTP. Please try again.';
      }
    });
  }

  resendOTP() {
    if (!this.email) return;
    
    this.loading = true;
    this.error = null;
    
    this.http.post('https://smartrecruit-l27g.onrender.com/api/student/send-otp/', 
      { email: this.email },
      { withCredentials: true }
    ).subscribe({
      next: () => {
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.error = 'Failed to resend OTP. Please try again.';
      }
    });
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, HttpClientModule, FormsModule],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit {
  resetForm: FormGroup;
  loading = false;
  error: string | null = null;
  success = false;
  email: string | null = null;
  private otp: string | null = null;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {
    this.resetForm = this.fb.group({
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordsMatch });
  }

  ngOnInit() {
    this.email = sessionStorage.getItem('resetEmail');
    this.otp = sessionStorage.getItem('otp');
    
    if (!this.email || !this.otp) {
      this.router.navigate(['/forgot-password']);
    }
  }

  passwordsMatch(group: FormGroup) {
    const newPassword = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return newPassword === confirmPassword ? null : { mismatch: true };
  }

  onSubmit() {
    if (this.resetForm.invalid || !this.email || !this.otp) {
      return;
    }

    this.loading = true;
    this.error = null;

    const newPassword = this.resetForm.get('newPassword')?.value;
    
    this.http.post('https://smartrecruit-l27g.onrender.com/api/student/reset-password/', {
      email: this.email,
      otp: this.otp,
      new_password: newPassword
    }, { withCredentials: true }).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;
        
        sessionStorage.removeItem('resetEmail');
        sessionStorage.removeItem('otp');
      },
      error: (error) => {
        this.loading = false;
        this.error = error.error?.status || 'Failed to reset password. Please try again.';
      }
    });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}

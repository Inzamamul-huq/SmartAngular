import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, HttpClientModule],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.css']
})
export class ForgotPasswordComponent {
  forgotForm: FormGroup;
  loading = false;
  error: string | null = null;
  success = false;
  emailSentTo: string | null = null;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router
  ) {
    this.forgotForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  onSubmit() {
    if (this.forgotForm.invalid) {
      return;
    }

    this.loading = true;
    this.error = null;
    const email = this.forgotForm.get('email')?.value;

    this.http.post('https://smartrecruit-l27g.onrender.com/api/student/send-otp/', { email }, { withCredentials: true })
      .subscribe({
        next: () => {
          this.success = true;
          this.emailSentTo = email;
          
          sessionStorage.setItem('resetEmail', email);
          
          this.router.navigate(['/verify-otp']);
        },
        error: (error) => {
          this.error = error.error?.status || 'Failed to send OTP. Please try again.';
          this.loading = false;
        }
      });
  }
}

import { Component, OnDestroy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { catchError, finalize } from 'rxjs/operators';
import { Subject, takeUntil, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-adminlogin',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, RouterModule],
  templateUrl: './adminlogin.html',
  styleUrls: ['./adminlogin.css']
})
export class Adminlogin implements OnDestroy {
  email: string = '';
  password: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onLogin() {
    if (!this.email || !this.password) {
      this.errorMessage = 'Please enter both email and password';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.login(this.email, this.password)
      .pipe(
        takeUntil(this.destroy$),
        catchError((error) => {
          this.isLoading = false;
          if (error.status === 400 || error.status === 401) {
            this.errorMessage = 'Invalid email or password';
          } else if (error.status === 403) {
            this.errorMessage = 'Account not approved or inactive';
          } else if (error.status === 404) {
            this.errorMessage = 'User not found';
          } else {
            this.errorMessage = 'An error occurred. Please try again later.';
          }
          return throwError(() => error);
        }),
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe({
        next: (response) => {
          console.log('[Adminlogin] Login success. response.user=', response?.user);
          
          if (response.user?.is_staff) {
            console.log('[Adminlogin] Redirecting to /admindashboard');
            this.router.navigate(['/admindashboard']).then((ok) => {
              console.log('[Adminlogin] Router.navigate(/admindashboard) result =', ok);
              if (!ok) {
                console.warn('[Adminlogin] Navigation failed. Forcing hard redirect to /admindashboard');
                window.location.href = '/admindashboard';
              }
            });
          } else {
            console.log('[Adminlogin] Redirecting to /studentdashboard');
            this.router.navigate(['/studentdashboard']).then((ok) => {
              console.log('[Adminlogin] Router.navigate(/studentdashboard) result =', ok);
              if (!ok) {
                console.warn('[Adminlogin] Navigation failed. Forcing hard redirect to /studentdashboard');
                window.location.href = '/studentdashboard';
              }
            });
          }
        },
        error: (error) => {
          console.error('Login error:', error);
        }
      });

  }

}

import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Router } from '@angular/router';

export interface User {
  id: number;
  email: string;
  name?: string;
  is_staff: boolean;
}

interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}



@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'https://smartrecruit-l27g.onrender.com/api';
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasToken());
  private currentUserSubject = new BehaviorSubject<User | null>(this.getUserFromStorage());
  
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  public currentUser$ = this.currentUserSubject.asObservable();
  public redirectUrl: string | null = null;

  get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  get isAdmin(): boolean {
    return this.currentUserValue?.is_staff || false;
  }

  constructor(private http: HttpClient, private router: Router) {}

  private hasToken(): boolean {
    if (typeof window !== 'undefined' && window.localStorage) {
      return !!localStorage.getItem('access_token');
    }
    return false;
  }

  login(email: string, password: string): Observable<any> {
    const payload: any = { password };
    payload.email = email;
    payload.username = email;

    return this.http.post(`${this.apiUrl}/auth/login/`, payload).pipe(
      tap((response: any) => {
        if (response?.access && response?.refresh) {
          const user: User = response.user || { id: 0, email, name: email, is_staff: false };
          this.setTokens({ access: response.access, refresh: response.refresh, user });
          this.isAuthenticatedSubject.next(true);
        }
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Login error:', error);
        return throwError(() => error);
      })
    );
  }

  logout(): void {
    const refreshToken = typeof window !== 'undefined' && window.localStorage 
      ? localStorage.getItem('refresh_token')
      : null;
      
    if (refreshToken) {
      this.http.post(`${this.apiUrl}/auth/logout/`, { refresh: refreshToken })
        .subscribe({
          next: () => this.clearTokens(),
          error: () => this.clearTokens()
        });
    } else {
      this.clearTokens();
    }
  }

  refreshToken(): Observable<any> {
    const refreshToken = typeof window !== 'undefined' && window.localStorage 
      ? localStorage.getItem('refresh_token')
      : null;
      
    if (!refreshToken) {
      this.clearTokens();
      return throwError(() => new Error('No refresh token available'));
    }
    
    return this.http.post(`${this.apiUrl}/auth/token/refresh/`, { refresh: refreshToken })
      .pipe(
        tap((response: any) => {
          if (typeof window !== 'undefined' && window.localStorage) {
            localStorage.setItem('access_token', response.access);
            if (response.refresh) {
              localStorage.setItem('refresh_token', response.refresh);
            }
          }
        })
      );
  }

  getAccessToken(): string | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('access_token');
    }
    return null;
  }

  isLoggedIn(): boolean {
    return this.hasToken();
  }

  private setTokens(response: LoginResponse): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('access_token', response.access);
      localStorage.setItem('refresh_token', response.refresh);
      this.setUser(response.user);
    }
  }

  private setUser(user: User): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('user', JSON.stringify(user));
    }
    this.currentUserSubject.next(user);
  }

  private clearTokens(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      
      localStorage.removeItem('user');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
    this.isAuthenticatedSubject.next(false);
    this.currentUserSubject.next(null);
    
    setTimeout(() => {
      this.router.navigate(['/login']);
    }, 0);
  }

  private getUserFromStorage(): User | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          
          return {
            id: user.id,
            email: user.email || '',
            name: user.name || user.email,
            is_staff: user.is_staff || false
          };
        } catch (e) {
          console.error('Error parsing user data:', e);
          return null;
        }
      }
    }
    return null;
  }

  getUser(): User | null {
    return this.currentUserValue;
  }

  hasRole(requiredRoles: string[]): boolean {
    const user = this.currentUserValue;
    if (!user) return false;
    
    
    if (requiredRoles.includes('admin') && user.is_staff) {
      return true;
    }
    
    if (requiredRoles.includes('student') && !user.is_staff) {
      return true;
    }
    
    return false;
  }

  isOwner(resourceOwnerId: number): boolean {
    const user = this.currentUserValue;
    return user ? user.id === resourceOwnerId : false;
  }
}

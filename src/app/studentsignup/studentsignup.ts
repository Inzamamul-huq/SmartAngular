import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';

interface SignupResponse {
  status: string;
  message: string;
  user?: {
    id: number;
    name: string;
    email: string;
    phone: string;
  };
}

@Component({
  selector: 'app-studentsignup',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, RouterModule],
  templateUrl: './studentsignup.component.html',
  styleUrls: ['./studentsignup.component.css']
})
export class Studentsignup {
  @ViewChild('signupForm') signupForm!: NgForm;
  
  user = {
    name: '',
    email: '',
    phone: '',
    password: ''
  };
  
  loading = false;
  error: string | null = null;
  success: boolean = false;
  successMessage = 'Signup successful! You can now login with your credentials.';

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  onSubmit() {
    if (this.loading) return;
    
    this.loading = true;
    this.error = null;
    
    const signupData = {
      name: this.user.name,
      email: this.user.email,
      phone: this.user.phone,
      password: this.user.password
    };
    
    console.log('Sending signup data:', signupData);
    
    this.http.post<SignupResponse>('https://smartrecruit-l27g.onrender.com/api/student/signup/', signupData, {
      withCredentials: true, 
      headers: { 'Content-Type': 'application/json' } 
    })
    .subscribe({
      next: (response) => {
        console.log('Signup response:', response); 
        this.loading = false; 
        
        if (response && response.status === 'signup success') {
          this.error = null;
          this.success = true;
          this.successMessage = 'Signup successful! You can now login with your credentials.';
          
          this.user = { name: '', email: '', phone: '', password: '' };
          this.signupForm.resetForm();
        } else {
          this.error = response?.message || 'Signup failed. Please try again.';
        }
      },
      error: (error) => {
        console.error('Signup error:', error); 
        this.loading = false; 
        this.error = error.error?.message || 'An error occurred during signup. Please try again.';
      }
    });
  }
}

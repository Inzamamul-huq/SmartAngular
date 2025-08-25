import { Component, OnInit, inject, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { FormsModule } from '@angular/forms';
import { AppliedJobsComponent } from '../applied-jobs/applied-jobs.component';

interface Job {
  id: number;
  title: string;
  description: string;
  created_at?: string;
}

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    HttpClientModule,
    RouterModule,
    AppliedJobsComponent
  ],
  templateUrl: './student-dashboard.html',
  styleUrls: ['./student-dashboard.css']
})
export class StudentDashboard implements OnInit, OnDestroy {
  jobs: Job[] = [];
  loading: boolean = true;
  error: string | null = null;
  selectedJob: Job | null = null;
  searchTerm: string = '';
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();
  currentUser: any = null;
  activeTests: any[] = [];
  activeTab: 'jobs' | 'applications' = 'jobs';

  private http = inject(HttpClient);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private auth = inject(AuthService);

  constructor() {
    if (typeof window !== 'undefined') {
      const user = localStorage.getItem('user');
      if (user) {
        try {
          this.currentUser = JSON.parse(user);
          
          const url = new URL(window.location.href);
          const tab = url.searchParams.get('tab');
          if (tab === 'applications') {
            this.activeTab = 'applications';
          }
        } catch (e) {
          console.error('Error parsing user data:', e);
          this.router.navigate(['/login']);
        }
      } else {
        this.router.navigate(['/login']);
      }
    }
  }

  fetchActiveTests() {
    try {
      const user = this.auth.getUser();
      if (!user?.email) return;
      
      this.http.get<any>(`/api/student/active-tests/${user.email}/`, { withCredentials: true })
        .subscribe({
          next: (res) => {
            if (res?.status === 'success' && Array.isArray(res.schedules)) {
              this.activeTests = res.schedules;
            }
            this.cdr.detectChanges();
          },
          error: (err) => {
            if (err?.status === 404) {
               
              this.activeTests = [];
              this.cdr.detectChanges();
            } else {
              console.warn('Failed to fetch active tests', err);
            }
          }
        });
    } catch (e) {
      console.warn('Error in fetchActiveTests:', e);
    }
  }
  ngOnInit() {
    
    if (typeof window !== 'undefined') {
      this.setupSearch();
      this.fetchJobs();
      this.fetchActiveTests();
    } else {
      console.warn('Running in non-browser environment, skipping initialization');
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setActiveTab(tab: 'jobs' | 'applications'): void {
    this.activeTab = tab;
    
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.pushState({}, '', url.toString());
  }

  private setupSearch() {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(term => {
      this.searchTerm = term;
      this.cdr.detectChanges();
    });
  }

  onSearchInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.searchSubject.next(value);
  }

  fetchJobs() {
    console.log('fetchJobs called, setting loading to true');
    this.loading = true;
    this.error = null;
    this.cdr.detectChanges();
    
    console.log('Fetching jobs from: https://smartrecruit-l27g.onrender.com/api/jobs/');
    
    this.http.get<Job[]>('https://smartrecruit-l27g.onrender.com/api/jobs/')
      .subscribe({
        next: (data) => {
          console.log('Jobs data received:', data);
          this.jobs = Array.isArray(data) ? data : [];
          console.log('Jobs after assignment:', this.jobs);
          this.loading = false;
          console.log('Loading set to false');
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('Error fetching jobs:', err);
          this.loading = false; 
          
          if (err.status === 0) {
            this.error = 'Unable to connect to the server. Please check if the backend server is running.';
          } else if (err.status === 404) {
            this.error = 'The jobs endpoint was not found. Please check the API URL.';
          } else {
            this.error = `Failed to load jobs: ${err.message || 'Unknown error'}`;
          }
          
          console.log('Error state - loading:', this.loading, 'error:', this.error);
          this.cdr.detectChanges();
        },
        complete: () => {
          console.log('API call completed');
        }
      });
  }

  viewJobDetails(job: Job) {
    this.router.navigate(['/job', job.id]);
  }

  closeJobDetails() {
    this.selectedJob = null;
  }

  getUserName(): string {
    return this.currentUser?.name || this.currentUser?.email?.split('@')[0] || 'User';
  }

  getUserEmail(): string {
    return this.currentUser?.email || '';
  }

  get filteredJobs(): Job[] {
    if (!this.jobs || this.jobs.length === 0) return [];
    const term = (this.searchTerm || '').trim().toLowerCase();
    
    if (!term) return [...this.jobs];
    
    return this.jobs.filter(job => {
      const titleMatch = job.title?.toLowerCase().includes(term) || false;
      const descMatch = job.description?.toLowerCase().includes(term) || false;
      return titleMatch || descMatch;
    });
  }

  applyForJob(job: Job) {
    console.log('Applying for job:', job.id);
    alert(`Application submitted for: ${job.title}`);
    this.closeJobDetails();
  }

  trackByJobId(index: number, job: Job): number {
    return job.id;
  }

  logout() {
    this.auth.logout();
  }

}

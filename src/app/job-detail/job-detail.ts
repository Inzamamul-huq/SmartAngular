import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { HttpClient, HttpErrorResponse, HttpEventType, HttpResponse } from '@angular/common/http';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';

interface Job {
  id: number;
  title: string;
  description: string;
  requirements: string;
  created_at?: string;
  
}

@Component({
  selector: 'app-job-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule
  ],
  templateUrl: './job-detail.html',
  styleUrls: ['./job-detail.css']
})
export class JobDetail implements OnInit {
  job: Job | null = null;
  loading = true;
  error: string | null = null;
  selectedFile: File | null = null;
  selectedFileName: string = '';
  uploadProgress = 0;
  uploading = false;
  resumeUploaded = false;
  submitting = false;
  applicationSubmitted = false;
  resumePath: string | null = null;
  isDragging = false;
  studentId: string = '';

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private auth = inject(AuthService);

  ngOnInit() {
    console.log('JobDetail component initialized');
    
    
    if (typeof window === 'undefined') {
      console.warn('Running in non-browser environment, skipping initialization');
      return;
    }

    const user = localStorage.getItem('user');
    if (!user) {
      console.log('No user found in localStorage, redirecting to login');
      this.router.navigate(['/login']);
      return;
    }

    try {
      const userData = JSON.parse(user);
      const email: string | undefined = userData?.email;
      if (!email) {
        throw new Error('Invalid user data format: missing email');
      }
      const lookupUrl = `https://smartrecruit-9ofm.onrender.com/api/student/by-email/?email=${encodeURIComponent(email)}`;
      this.http.get<{id: number; name: string; email: string}>(lookupUrl).pipe(
        catchError((err: HttpErrorResponse) => {
          console.error('Failed to resolve student by email', err);
          this.error = err.error?.error || 'Unable to resolve student account';
          this.cdr.detectChanges();
          return of(null);
        })
      ).subscribe((res) => {
        if (!res?.id) {
          console.warn('Student lookup returned no id');
          return;
        }
        this.studentId = String(res.id);
        this.loadJobDetails();
      });
    } catch (e) {
      console.error('Error initializing component:', e);
      this.router.navigate(['/login']);
    }

  }

  private loadJobDetails() {
    const jobId = this.route.snapshot.paramMap.get('id');
    
    if (!jobId) {
      console.error('No job ID found in route');
      this.error = 'Invalid job ID';
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.error = null;
    this.cdr.detectChanges();

    const url = `https://smartrecruit-9ofm.onrender.com/api/jobs/${jobId}/`;
    console.log('API URL:', url);

    this.http.get<Job>(url).pipe(
      catchError((err: HttpErrorResponse) => {
        console.error('Error fetching job details:', {
          error: err,
          status: err.status,
          statusText: err.statusText,
          url: err.url,
          message: err.message
        });
        this.error = `Failed to load job details. ${err.status ? `Status: ${err.status} ${err.statusText}` : 'Server might be down'}`;
        return of(null);
      }),
      finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      })
    ).subscribe(data => {
      if (data) {
        if (!data.id) {
          console.warn('Received job data is missing required fields:', data);
          this.error = 'Invalid job data format received';
        } else {
          this.job = data;
          console.log('Job data assigned:', this.job);
        }
      }
    });
  }

  onFileSelected(event: any) {
    const file = event?.target?.files?.[0] || event?.dataTransfer?.files?.[0];
    if (file) {
      
      const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!validTypes.includes(file.type)) {
        this.error = 'Invalid file type. Please upload a PDF or Word document.';
        this.selectedFileName = '';
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        this.error = 'File size too large. Maximum size is 5MB.';
        this.selectedFileName = '';
        return;
      }
      
      this.selectedFile = file;
      this.selectedFileName = file.name;
      this.error = null;
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave() {
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
    
    if (event.dataTransfer?.files?.length) {
      this.onFileSelected(event);
    }
  }

  uploadResume() {
    if (!this.selectedFile || !this.studentId) {
      this.error = 'Please select a file and ensure you are logged in';
      return;
    }
    
    this.uploading = true;
    this.error = null;
    
    const formData = new FormData();
    formData.append('resume', this.selectedFile);

    this.http.post(`https://smartrecruit-9ofm.onrender.com/api/student/upload-resume/${this.studentId}/`, formData, {
      reportProgress: true,
      observe: 'events'
    }).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error uploading resume:', error);
        this.error = error.error?.error || error.error?.detail || 'Failed to upload resume. Please try again.';
        this.uploading = false;
        this.uploadProgress = 0;
        this.cdr.detectChanges();
        return of(null);
      }),
      finalize(() => {
        this.uploading = false;
        this.cdr.detectChanges();
      })
    ).subscribe((event: any) => {
      if (!event) {
        return;
      }
      if (event.type === HttpEventType.UploadProgress) {
        this.uploadProgress = Math.round(100 * event.loaded / (event.total || 1));
      } else if (event instanceof HttpResponse) {
        if (event.body?.status === 'Resume uploaded') {
          this.resumeUploaded = true;
          this.uploadProgress = 100;
          this.error = null;
        } else {
          this.error = event.body?.status || 'Failed to upload resume';
        }
      }
    });
  }

  applyForJob() {
    if (!this.job?.id || !this.selectedFile) {
      this.error = 'Please upload your resume before applying';
      this.cdr.detectChanges();
      return;
    }

    this.submitting = true;
    this.error = null;
    
    const formData = new FormData();
    formData.append('student_id', this.studentId);
    formData.append('resume', this.selectedFile);

    this.http.post(
      `https://smartrecruit-9ofm.onrender.com/api/jobs/${this.job.id}/apply/`,
      formData
    ).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error applying for job:', error);
        let errorMessage = 'Failed to submit application. Please try again.';
        
        if (error.status === 400) {
          errorMessage = error.error?.error || error.error?.detail || errorMessage;
        } else if (error.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        }
        
        this.error = errorMessage;
        this.submitting = false;
        this.cdr.detectChanges();
        return of(null);
      })
    ).subscribe((response: any) => {
      this.submitting = false;
      if (response) {
        if (response.status === 'already_applied') {
          this.error = response.message;
        } else if (response.success) {
          this.applicationSubmitted = true;
          this.error = null;
        } else {
          this.error = 'Failed to submit application. Please try again.';
        }
      }
      this.cdr.detectChanges();
    });
  }

  goBack() {
    this.router.navigate(['/studentdashboard']);
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';

interface Job {
  id: number;
  title: string;
  description: string;
  created_at?: string;
}

@Component({
  selector: 'app-edit-job',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './edit-job.component.html',
  styleUrls: ['./edit-job.component.css']
})
export class EditJobComponent implements OnInit {
  jobForm: FormGroup;
  jobId: number | null = null;
  loading = true;
  error: string | null = null;
  submitting = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private authService: AuthService
  ) {
    this.jobForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      description: ['', [Validators.required, Validators.minLength(10)]]
    });
  }

  ngOnInit(): void {
    this.jobId = +this.route.snapshot.paramMap.get('id')!;
    if (this.jobId) {
      this.loadJob(this.jobId);
    } else {
      this.error = 'No job ID provided';
      this.loading = false;
    }
  }

  loadJob(id: number): void {
    this.loading = true;
    this.error = null;

    this.http.get<Job>(`http://localhost:https://smartrecruit-9ofm.onrender.com/api/jobs/${id}/`, {
      withCredentials: true
    }).subscribe({
      next: (job) => {
        this.jobForm.patchValue({
          title: job.title,
          description: job.description
        });
        this.loading = false;
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error loading job:', error);
        this.error = 'Failed to load job details. ' + 
          (error.error?.message || error.statusText || 'Please try again later.');
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    if (this.jobForm.invalid || !this.jobId) {
      return;
    }

    this.submitting = true;
    this.error = null;

    this.http.put(
      `http://localhost:https://smartrecruit-9ofm.onrender.com/api/jobs/crud/${this.jobId}/`,
      this.jobForm.value,
      { withCredentials: true }
    ).subscribe({
      next: () => {
        this.router.navigate(['/admindashboard'], {
          queryParams: { updated: true }
        });
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error updating job:', error);
        this.error = 'Failed to update job. ' +
          (error.error?.message || error.statusText || 'Please try again.');
        this.submitting = false;
      }
    });
  }

  onCancel(): void {
    this.router.navigate(['/admindashboard']);
  }

  get f() {
    return this.jobForm.controls;
  }
}

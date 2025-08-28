import { Component, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpEventType, HttpRequest, HttpEvent } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { TitleCasePipe } from '../pipes/title-case.pipe';
import { TruncatePipe } from '../pipes/truncate.pipe';
import { NgbModal, NgbModalRef, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { forkJoin } from 'rxjs';
import { FormBuilder, FormGroup, FormArray, FormControl, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';

export interface Job {
  id: number;
  title: string;
  description: string;
  created_at: string;
  requirements?: string;
  responsibilities?: string;
  job_date?: string;
  location?: string;
  salary?: string;
  job_type?: string;
  created_by?: string;
  opportunities?: JobOpportunity[];
  received_opportunities?: JobOpportunity[];
}

export interface JobOpportunity {
  id: number;
  job_id: number;
  title: string;
  description: string;
  student_email: string;
  message_sent: boolean;
  sent_at?: string;
  created_at: string;
  message?: string;
}

interface TestInfo {
  id: number;
  test_time: string;
  duration_minutes?: number;
  is_completed: boolean;
  score: number | null;
  can_start: boolean;
}

interface AppliedJob {
  id: number;
  job_id: number;
  job: Job;
  student_email: string;
  status: 'applied' | 'under_review' | 'test_scheduled' | 'test_completed' | 'selected' | 'rejected';
  applied_at: string;
  test_scheduled: boolean;
  test_info: TestInfo | null;
}

@Component({
  selector: 'app-applied-jobs',
  standalone: true,
  imports: [
    CommonModule, 
    RouterLink, 
    TitleCasePipe, 
    TruncatePipe, 
    NgbModule, 
    ReactiveFormsModule,
    FormsModule
  ],
  templateUrl: './applied-jobs.component.html',
  styleUrls: ['./applied-jobs.component.css']
})
export class AppliedJobsComponent implements OnInit {
  appliedJobs: AppliedJob[] = [];
  loading: boolean = true;
  error: string | null = null;
  selectedJob: Job | null = null;
  selectedApplication: AppliedJob | null = null;
  showMessageForm: boolean = false;
  messageContent: string = '';
  isSending: boolean = false;
  messageError: string | null = null;
  activeTab: string = 'applied';
  jobOpportunities: any[] = [];

  @ViewChild('jobDetailsModal') jobDetailsModal: TemplateRef<any> | undefined;
  @ViewChild('opportunityModal') opportunityModal: TemplateRef<any> | undefined;
  @ViewChild('shareExperienceModal') shareExperienceModal: TemplateRef<any> | undefined;
  selectedOpportunity: any = null;
  experienceForm!: FormGroup;
  isSubmitting = false;
  selectedFiles: { [key: string]: File } = {};
  private currentJobId: number | null = null;
  confirmedInstructions = false;
  selectedTestJob: any = null;
  @ViewChild('testInstructionsModal') testInstructionsModal: TemplateRef<any> | undefined;
  
  constructor(
    private http: HttpClient,
    private auth: AuthService,
    private router: Router,
    private modalService: NgbModal,
    private fb: FormBuilder
  ) {
    this.initExperienceForm();
  }

  private initExperienceForm() {
    this.experienceForm = this.fb.group({
      company_name: ['', Validators.required],
      division_name: ['', Validators.required],
      aptitude_conducted: [false],
      aptitude_questions: [''],
      technical_conducted: [false],
      technical_questions: [''],
      gd_conducted: [false],
      gd_topics: [''],
      hr_conducted: [false],
      hr_questions: [''],
      tips: [''],
      overall_experience: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.fetchAppliedJobs();
    this.fetchJobOpportunities();
  }

  fetchJobOpportunities(jobId?: number): void {
    const user = this.auth.getUser();
    if (!user?.email) return;
    
    if (jobId) {
      this.http.get<any>(`/api/jobs/${jobId}/opportunities/`, { withCredentials: true }).subscribe({
        next: (response) => {
          if (response.status === 'success' && this.selectedJob) {
            this.selectedJob.received_opportunities = response.opportunities || [];
          }
        },
        error: (error) => {
          console.error('Error fetching job opportunities:', error);
        }
      });
    } else {
      this.http.get<any>('https://smartrecruit-9ofm.onrender.com/api/job-opportunities/student/', {
        params: { student_email: user.email },
        withCredentials: true
      }).subscribe({
        next: (response) => {
          if (response.status === 'success') {
            this.jobOpportunities = response.opportunities || [];
          }
        },
        error: (error) => {
          console.error('Error fetching job opportunities:', error);
        }
      });
    }
  }

  fetchAppliedJobs(): void {
    this.loading = true;
    const user = this.auth.getUser();
    
    if (!user?.email) {
      this.error = 'User not authenticated';
      this.loading = false;
      return;
    }

    this.http.get<{status: string, applications: AppliedJob[]}>(`https://smartrecruit-9ofm.onrender.com/api/student/applications/${user.email}/`, { withCredentials: true })
      .subscribe({
        next: (response) => {
          if (response.status === 'success') {
            this.appliedJobs = response.applications;
          } else {
            this.error = 'Failed to fetch applied jobs';
          }
          this.loading = false;
        },
        error: (err) => {
          console.error('Error fetching applied jobs:', err);
          this.error = 'Error fetching your applications. Please try again later.';
          this.loading = false;
        }
      });
  }

  canStartTest(job: AppliedJob): boolean {
    if (job.status !== 'test_scheduled' || !job.test_info || job.test_info.is_completed) {
      return false;
    }
    
    if (job.test_info.test_time) {
      const testStartTime = new Date(job.test_info.test_time);
      const testEndTime = new Date(testStartTime);
      testEndTime.setMinutes(testEndTime.getMinutes() + (job.test_info.duration_minutes || 60));
      
      const now = new Date();
      return now < testEndTime;
    }
    
    return false;
  }

  getTestAvailabilityMessage(job: AppliedJob): string {
    if (!job.test_info) return 'Test not scheduled';
    
    if (job.test_info.is_completed) return 'Test Completed';
    
    if (job.test_info.test_time) {
      const testStartTime = new Date(job.test_info.test_time);
      const testEndTime = new Date(testStartTime);
      testEndTime.setMinutes(testEndTime.getMinutes() + (job.test_info.duration_minutes || 60));
      const now = new Date();
      
      if (now < testStartTime) {
        const timeDiff = testStartTime.getTime() - now.getTime();
        const hoursLeft = Math.ceil(timeDiff / (1000 * 60 * 60));
        
        if (hoursLeft > 24) {
          const days = Math.ceil(hoursLeft / 24);
          return `Test starts in ${days} day${days > 1 ? 's' : ''}`;
        } else if (hoursLeft > 1) {
          return `Test starts in ${hoursLeft} hours`;
        } else {
          const minutes = Math.ceil(timeDiff / (1000 * 60));
          return `Test starts in ${minutes} minutes`;
        }
      } else if (now < testEndTime) {
        const timeLeft = Math.ceil((testEndTime.getTime() - now.getTime()) / (1000 * 60));
        if (timeLeft > 60) {
          const hours = Math.floor(timeLeft / 60);
          const mins = timeLeft % 60;
          return `Available - ${hours}h ${mins}m left`;
        } else {
          return `Available - ${timeLeft} min${timeLeft !== 1 ? 's' : ''} left`;
        }
      } else {
        return 'Test time has ended';
      }
    }
    
    return 'Test Not Available';
  }

  showTestInstructions(job: AppliedJob): void {
    if (!this.canStartTest(job)) {
      alert(this.getTestAvailabilityMessage(job));
      return;
    }
    this.confirmedInstructions = false;
    this.selectedTestJob = job;
    this.modalService.open(this.testInstructionsModal, { size: 'lg', backdrop: 'static' });
  }

  getTestDuration(): number | null {
    
    if (this.selectedTestJob?.test_info?.duration_minutes !== undefined) {
      return this.selectedTestJob.test_info.duration_minutes;
    }
    
    if (this.selectedTestJob?.duration_minutes !== undefined) {
      return this.selectedTestJob.duration_minutes;
    }
    
    return null;
  }

  startTest(job: AppliedJob): void {
    if (!this.canStartTest(job)) {
      alert(this.getTestAvailabilityMessage(job));
      return;
    }
    
    
    if (job.test_info && job.test_info.id) {
      this.router.navigate(['/student-test', job.test_info.id]);
    } else {
      console.error('Could not find test schedule information');
      alert('Error: Could not start test. Missing test schedule information.');
    }
  }

  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'test_scheduled':
        return 'badge-warning';
      case 'test_completed':
        return 'badge-success';
      case 'rejected':
        return 'badge-danger';
      default:
        return 'badge-info';
    }
  }

  showJobDetails(application: any): void {
    const currentUser = this.auth.getUser();
    if (!currentUser?.email) {
      console.error('User not authenticated');
      return;
    }

    if (application.status !== 'selected') {
      console.error('You are not selected for this job');
      alert('You are not selected for this job');
      return;
    }

    if (application.student_email && application.student_email !== currentUser.email) {
      console.error('You are not authorized to view this job opportunity');
      alert('You are not authorized to view this job opportunity');
      return;
    }

    this.selectedApplication = application;
    this.selectedJob = { ...application.job };

    forkJoin([
      this.http.get<Job>(`/api/jobs/${application.job.id}/details/`),
      this.http.get<JobOpportunity[]>(`/api/jobs/${application.job.id}/opportunities/`)
    ]).subscribe({
      next: ([jobDetails, opportunities]) => {
        const userOpportunities = opportunities.filter(
          (opp: any) => opp.student_email === currentUser.email
        );
        
        this.selectedJob = { 
          ...this.selectedJob, 
          ...jobDetails,
          opportunities: userOpportunities
        };
        
        this.openJobDetailsModal();
      },
      error: (error) => {
        console.error('Error fetching job details:', error);
        this.openJobDetailsModal();
      }
    });
  }

  sendJobOpportunity(): void {
    if (!this.selectedApplication || !this.messageContent.trim()) {
      this.messageError = 'Please enter a message';
      return;
    }

    this.isSending = true;
    this.messageError = null;

    this.http.post('/api/send-job-details/', {
      job_id: this.selectedApplication.job.id,
      student_email: this.selectedApplication.student_email,
      message: this.messageContent
    }).subscribe({
      next: (response: any) => {
        this.isSending = false;
        if (this.selectedJob) {
          this.selectedJob.opportunities = this.selectedJob.opportunities || [];
          this.selectedJob.opportunities.push({
            id: response.opportunity_id,
            job_id: this.selectedApplication!.job.id,
            title: this.selectedApplication!.job.title,
            student_email: this.selectedApplication!.student_email,
            message_sent: true,
            sent_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            description: this.messageContent,
            message: this.messageContent
          });
        }
        this.showMessageForm = false;
        this.messageContent = '';
      },
      error: (error) => {
        this.isSending = false;
        this.messageError = error.error?.message || 'Failed to send message';
      }
    });
  }

  viewOpportunityDetails(opportunity: any): void {
    this.selectedOpportunity = opportunity;
    if (this.opportunityModal) {
      this.modalService.open(this.opportunityModal, { size: 'lg' });
    }
  }

  viewFullDetails(opportunity: any, event: Event): void {
    event.stopPropagation();
    this.viewOpportunityDetails(opportunity);
  }

  openShareExperienceModal(opportunity: any): void {
    this.selectedOpportunity = opportunity;
    this.currentJobId = opportunity.job_id;
    this.experienceForm.reset({
      company_name: opportunity.company_name || '',
      division_name: opportunity.division_name || '',
      aptitude_conducted: false,
      technical_conducted: false,
      gd_conducted: false,
      hr_conducted: false
    });
    this.selectedFiles = {};
    this.modalService.open(this.shareExperienceModal, { size: 'lg' });
  }

  onFileSelected(event: any, field: string): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFiles[field] = file;
    }
  }

  submitExperience(): void {
    if (this.experienceForm.invalid) {
      Object.keys(this.experienceForm.controls).forEach(key => {
        this.experienceForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;
    const formData = new FormData();
    const currentUser = this.auth.getUser();
    const formValue = this.experienceForm.value;

    Object.keys(formValue).forEach(key => {
      if (formValue[key] !== null && formValue[key] !== undefined) {
        formData.append(key, formValue[key]);
      }
    });

    if (this.currentJobId) {
      formData.append('job_id', this.currentJobId.toString());
    }
    if (currentUser?.email) {
      formData.append('student_email', currentUser.email);
    }

    Object.keys(this.selectedFiles).forEach(key => {
      formData.append(key, this.selectedFiles[key]);
    });

    this.http.post('/api/interview-questions/experience/', formData).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        this.modalService.dismissAll();
        alert('Thank you for sharing your interview experience!');
      },
      error: (error) => {
        console.error('Error submitting experience:', error);
        this.isSubmitting = false;
        alert('Failed to submit experience. Please try again.');
      }
    });
  }

  private openJobDetailsModal(): void {
    if (this.jobDetailsModal) {
      const modalRef = this.modalService.open(this.jobDetailsModal, { size: 'lg' });
      modalRef.result.then(
        () => { 
          this.selectedJob = null;
          this.selectedApplication = null;
        },
        () => { 
          this.selectedJob = null;
          this.selectedApplication = null;
        }
      );
    }
  }
}

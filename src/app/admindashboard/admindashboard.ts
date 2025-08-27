import { Component, OnInit, ChangeDetectorRef, ViewChild, OnDestroy } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { AuthService } from '../services/auth.service';
import { Subject, takeUntil } from 'rxjs';

interface TestSchedule {
  job: number;
  student: number;
  test_time: string;
  duration_minutes: number;
  test_type: string;
  test_link: string;
  message: string;
}
import { filter } from 'rxjs/operators';
import { TruncatePipe } from '../shared/pipes/truncate.pipe';

interface Student {
  id: number;
  username: string;
  email: string;
  name: string;
  phone: string;
  resume: string | null;
  is_selected: string | null;
  admin_tips: string | null;
  allow?: string | null; 
}

interface JobPost {
  title: string;
  description: string;
}

interface Job {
  id: number;
  title: string;
  description: string;
  created_at: string;
  applicants_count?: number;
  applicants?: Applicant[];
  questions?: any[]; 
}

interface MCQQuestion {
  id?: number;
  job_id: number;
  question_text: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correct_option: number;
  job_details?: {
    id: number;
    title: string;
    description: string;
  };
  
  [key: string]: any;
}

interface Applicant {
  id: number;
  name: string;
  email: string;
  resume_url: string | null;
  applied_at: string;
  resume: string | null;
  student_id?: number | null;
  is_shortlisted?: boolean;
  test_score?: number | null;
  test_schedule_id?: number | null;
  [key: string]: any; // Add index signature to allow additional properties
}

@Component({
  selector: 'app-admindashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, RouterModule, TruncatePipe],
  templateUrl: './admindashboard.html',
  styleUrls: ['./admindashboard.css']
})
export class Admindashboard implements OnInit, OnDestroy {
  students: Student[] = [];
  error: string | null = null;
  activeTab: 'users' | 'postJob' | 'jobList' | 'jobApplicants' | 'experiences' = 'users';
  
  jobPost: JobPost = {
    title: '',
    description: ''
  };
  
  jobApplicants: any[] = [];
  postingJob = false;
  postSuccess = false;
  postError: string | null = null;
  jobs: Job[] = [];
  jobsLoading: boolean = false;
  selectedJob: Job | null = null;
  selectAllApplicants = false;
  showQuestionModal = false;
  showQuestionsList = false;
  jobQuestions: MCQQuestion[] = [];
  questionsLoading = false;
  
  
  newQuestion: MCQQuestion = {
    job_id: 0,
    question_text: '',
    option1: '',
    option2: '',
    option3: '',
    option4: '',
    correct_option: 1
  };
  questionError: string | null = null;
  questionSuccess: string | null = null;
  
  @ViewChild('questionForm') questionForm!: NgForm;
  
  showScheduleTestModal = false;
  testSchedule: TestSchedule = {
    job: 0,
    student: 0,
    test_time: '',
    duration_minutes: 60,
    test_type: 'CODING',
    test_link: '',
    message: ''
  };
  minTestTime: string = '';
  schedulingTest = false;
  scheduleError: string | null = null;
  scheduleSuccess: string | null = null;

  openScheduleModal() {
    if (!this.selectedJob) {
      this.scheduleError = 'No job selected';
      return;
    }

    const selectedApplicants = this.jobApplicants.filter(
      applicant => applicant.is_shortlisted && applicant.student_id
    );

    if (selectedApplicants.length === 0) {
      this.scheduleError = 'Please shortlist at least one applicant with a valid student ID to schedule a test';
      return;
    }

    const now = new Date();
    now.setHours(now.getHours() + 1);
    now.setMinutes(0);
    now.setSeconds(0);
    this.minTestTime = now.toISOString().slice(0, 16);

    if (!this.testSchedule.test_time) {
      const defaultTime = new Date(now);
      defaultTime.setHours(defaultTime.getHours() + 1);
      
      this.testSchedule = {
        job: this.selectedJob.id,
        student: 0, 
        test_time: defaultTime.toISOString().slice(0, 16),
        duration_minutes: 60,
        test_type: 'CODING',
        test_link: `https://your-test-platform.com/test/${this.selectedJob.id}`,
        message: `Dear Candidate,

You have been scheduled for an online test for the position of ${this.selectedJob.title}.

Test Details:
- Date: ${defaultTime.toLocaleDateString()}
- Time: ${defaultTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
- Duration: 60 minutes
- Test Type: CODING
- Test Link: https://your-test-platform.com/test/${this.selectedJob.id}

Please ensure you have a stable internet connection.

Best regards,
Hiring Team`
      };
    }

    this.showScheduleTestModal = true;
    this.scheduleError = null;
    this.scheduleSuccess = null;
  }

  private destroy$ = new Subject<void>();
  user: any;

  constructor(
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private authService: AuthService
  ) { }

  
  private getCookie(name: string): string {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()?.split(';').shift() || '';
    return '';
  }

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    this.user = this.authService.getUser();
    if (!this.user) {
      this.authService.logout();
      return;
    }
    this.updateActiveTabFromRoute();
    
    if (this.activeTab === 'users') {
      this.fetchStudents();
    } else if (this.activeTab === 'jobList' || this.activeTab === 'jobApplicants') {
      this.fetchJobs();
    }
    
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updateActiveTabFromRoute();
    });
  }
  
  private updateActiveTabFromRoute() {
    
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      if (currentPath.includes('job-list') || currentPath.endsWith('/admindashboard')) {
        this.activeTab = 'jobList';
        this.fetchJobs(); 
      } else if (currentPath.includes('post-job')) {
        this.activeTab = 'postJob';
      } else if (currentPath.includes('users')) {
        this.activeTab = 'users';
      } else if (currentPath.includes('admin/experiences')) {
      }
      this.cdr.detectChanges();
    }
  }

  fetchStudents() {
    console.log('Fetching students...');
    this.error = null;
    
    this.http.get<any>('https://smartrecruit-9ofm.onrender.com/api/viewuser/', {
      params: { admin: 'true' },
      withCredentials: true
    })
    .subscribe({
      next: (response) => {
        try {
          console.log('API Response:', response);
          if (Array.isArray(response)) {
            this.students = response;
            console.log(`Loaded ${response.length} students`);
          } else if (response && response.status === 'success') {
            this.students = Array.isArray(response.data) ? response.data : [];
            console.log(`Loaded ${this.students.length} students from data field`);
          } else {
            this.error = response?.message || 'No student data found';
            console.warn('No valid student data in response');
          }
        } catch (e) {
          console.error('Error processing response:', e);
          this.error = 'Error processing server response';
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error fetching students:', err);
        this.error = err.error?.message || 'Failed to load students. Please try again.';
        this.students = [];
        this.cdr.detectChanges();
      }
    });
  }

  postJob() {
    
    
    if (this.postingJob) {
      console.log('Already posting, ignoring duplicate click');
      return;
    }
    
    
    if (!this.jobPost.title || !this.jobPost.description) {
      this.postError = 'Both title and description are required';
      console.log('Validation failed:', this.postError);
      return;
    }

    console.log('Starting job post with data:', this.jobPost);
    this.postingJob = true;
    this.postError = null;
    this.postSuccess = false;

    const url = 'https://smartrecruit-9ofm.onrender.com/api/admin/post-job/';
    console.log('Making request to:', url);

    this.http.post(url, this.jobPost, {
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    })
    .subscribe({
      next: (response: any) => {
        console.log('✅ Job post successful. Response:', response);
        
        this.jobPost = { title: '', description: '' };
        this.postSuccess = true;
        
        setTimeout(() => {
          this.postSuccess = false;
          this.cdr.detectChanges();
        }, 3000);
        
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('❌ Error posting job:', {
          error: err,
          status: err.status,
          statusText: err.statusText,
          errorDetails: err.error,
          headers: err.headers
        });
        
        this.postError = err.error?.message || 
                        err.error?.error?.toString() || 
                        `Error: ${err.status} - ${err.statusText || 'Unknown error'}`;
      },
      complete: () => {
        console.log('Request completed');
        this.postingJob = false;
        this.cdr.detectChanges();
      }
    });
  }

  setActiveTab(tab: 'users' | 'postJob' | 'jobList' | 'jobApplicants') {
    
    if (this.activeTab === tab) {
      if (tab === 'jobList' && (!this.jobs || this.jobs.length === 0 || this.jobs.length >= 1)) {
        this.fetchJobs();
      }
      return;
    }
    
    const previousTab = this.activeTab;
    
    this.error = null;
    this.postError = null;
    
    switch(tab) {
      case 'jobList':
        if (this.jobs.length === 0 || previousTab === 'postJob') {
          this.fetchJobs();
        }
        this.selectedJob = null;
        break;
        
      case 'postJob':
        this.jobPost = { title: '', description: '' };
        this.postSuccess = false;
        this.postError = null;
        this.selectedJob = null;
        break;
        
      case 'users':
        this.fetchStudents();
        this.selectedJob = null;
        break;
        
      case 'jobApplicants':
       
        if (!this.selectedJob) {
          this.activeTab = 'jobList';
          this.fetchJobs();
          this.cdr.detectChanges();
          return;
        }
        break;
    }
    
    this.activeTab = tab;
    this.cdr.detectChanges();
  }

  fetchJobs() {
    this.error = null;
    this.jobsLoading = true;
    this.jobs = [];
    
    this.http.get<any>('https://smartrecruit-9ofm.onrender.com/api/jobs/', {
      withCredentials: true
    }).subscribe({
      next: async (response) => {
        try {
          let jobs: Job[] = [];
          
          if (Array.isArray(response)) {
            jobs = response;
          } else if (response?.data?.length) {
            jobs = response.data;
          } else if (response?.jobs?.length) {
            jobs = response.jobs;
          } else if (response?.status === 'success' && response.jobs?.length) {
            jobs = response.jobs;
          } else {
            this.error = 'No jobs found';
            this.jobs = [];
            return;
          }

          
          this.jobs = jobs.map(job => ({
            ...job,
            questions: [] 
          }));

          console.log('Jobs with questions:', this.jobs);
        } catch (e) {
          console.error('Error processing jobs data:', e);
          this.error = 'Error processing jobs data';
          this.jobs = [];
        }
        this.jobsLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error fetching jobs:', error);
        this.error = error.error?.message || 
                   error.error?.error?.toString() || 
                   `Error: ${error.status} - ${error.statusText || 'Failed to load jobs'}`;
        this.jobs = [];
        this.jobsLoading = false;
        this.cdr.detectChanges();
      },
      complete: () => {
        this.jobsLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  viewApplicants(job: Job) {
    console.log('Viewing applicants for job ID:', job.id);
    this.selectedJob = { ...job, applicants: [] }; 
    this.activeTab = 'jobApplicants';
    this.error = null;
    
    this.loadJobQuestions(job.id);
    
    const url = `https://smartrecruit-9ofm.onrender.com/api/admin/viewjobapplicants/${job.id}/`;
    console.log('Fetching applicants from:', url);
    
    interface ApplicantsResponse {
      status: string;
      job_id: number;
      job_title: string;
      total_applicants: number;
      applicants: Applicant[];
    }
    
    
    this.http.get<ApplicantsResponse>(url, { withCredentials: true })
      .subscribe({
        next: (response) => {
          console.log('Applicants API response:', response);
          if (!this.selectedJob) return;
          
          this.selectedJob.title = response.job_title;
          
          if (!response.applicants || !Array.isArray(response.applicants)) {
            console.warn('No applicants array in response, initializing empty array');
            response.applicants = [];
          }
          
          if (response.applicants.length === 0) {
            console.log('No applicants found for this job');
            this.selectedJob.applicants = [];
            this.cdr.detectChanges();
            return;
          }
          
          
          this.http.get<any>('https://smartrecruit-9ofm.onrender.com/api/viewuser/admin/', {
            withCredentials: true
          }).subscribe({
            next: (studentsResponse) => {
              if (!this.selectedJob) return;
              
              const students = Array.isArray(studentsResponse) ? studentsResponse : 
                             (studentsResponse?.data || []);
              
              
              const validApplicants = response.applicants.filter(applicant => {
                const isValid = applicant && applicant.email;
                if (!isValid) {
                  console.warn('Skipping invalid applicant data:', applicant);
                }
                return isValid;
              });
              
              
              const applicantPromises = validApplicants.map(applicant => {
                return new Promise<Applicant>((resolve) => {
                  
                  
                  const student = students.find((s: any) => s?.email === applicant.email);
                  
                  if (student?.id) {
                    
                    this.http.get<any>(`https://smartrecruit-9ofm.onrender.com/api/student/view/${student.id}`, {
                      withCredentials: true
                    }).subscribe({
                      next: (studentDetails) => {
                        resolve({
                          ...applicant,
                          resume: studentDetails?.resume || applicant.resume || null,
                          resume_url: studentDetails?.resume_url || applicant.resume_url || null,
                          student_id: studentDetails?.id,
                          is_shortlisted: applicant.is_shortlisted || false
                        });
                      },
                      error: (err) => {
                        console.error('Error fetching student details:', err);
                        
                        resolve({
                          ...applicant,
                          resume: student?.resume || applicant.resume || null,
                          resume_url: student?.resume_url || applicant.resume_url || null,
                          student_id: student?.id,
                          is_shortlisted: applicant.is_shortlisted || false
                        });
                      }
                    });
                  } else {
                    
                    resolve({
                      ...applicant,
                      resume: applicant.resume || null,
                      resume_url: applicant.resume_url || null,
                      student_id: null,
                      is_shortlisted: applicant.is_shortlisted || false
                    });
                  }
                });
              });
              
              
              Promise.all(applicantPromises).then(applicants => {
                if (this.selectedJob) {
                  this.jobApplicants = [...applicants]; 
                  this.selectedJob.applicants = [...applicants];
                  console.log(`Loaded ${applicants.length} valid applicants`, this.jobApplicants);
                }
                this.cdr.detectChanges();
              });
            },
            error: (err) => {
              console.error('Error fetching students list:', err);
              
              if (this.selectedJob) {
                this.jobApplicants = response.applicants
                  .filter(a => a !== null && a !== undefined)
                  .map(applicant => ({
                    ...applicant,
                    resume: applicant.resume || null,
                    resume_url: applicant.resume_url || null,
                    student_id: null,
                    is_shortlisted: applicant.is_shortlisted || false
                  }));
                this.selectedJob.applicants = [...this.jobApplicants];
                console.log(`Loaded ${this.jobApplicants.length} applicants without resume info`, this.jobApplicants);
              }
              this.cdr.detectChanges();
            }
          });
        },
        error: (err) => {
          console.error('Error fetching applicants:', {
            error: err,
            status: err.status,
            statusText: err.statusText,
            errorDetails: err.error
          });
          this.error = 'Failed to load applicants. Please try again.';
          this.jobApplicants = [];
          if (this.selectedJob) {
            this.selectedJob.applicants = [];
          }
          console.log('Error loading applicants, reset jobApplicants to:', this.jobApplicants);
          this.cdr.detectChanges();
        }
      });
  }

  viewResume(applicant: Applicant) {
    // Prefer the canonical resume_url (Supabase public URL) over legacy resume field
    const resumeUrl = applicant.resume_url || applicant.resume;
    if (applicant.student_id && resumeUrl) {
      console.log('Opening resume URL:', resumeUrl);
      if (resumeUrl.startsWith('http')) {
        window.open(resumeUrl, '_blank');
      } else {
        const baseUrl = 'https://smartrecruit-9ofm.onrender.com';
        if (resumeUrl.startsWith('/media/')) {
          window.open(`${baseUrl}${resumeUrl}`, '_blank');
        } else {
          window.open(`${baseUrl}/media/resumes/${resumeUrl}`, '_blank');
        }
      }
    }
  }

  
  downloadResume(applicant: Applicant) {
    if (applicant.student_id && applicant.resume) {
      const link = document.createElement('a');
      const baseUrl = 'https://smartrecruit-9ofm.onrender.com';
      let resumeUrl = '';
      
      
      if (applicant.resume.startsWith('http')) {
        resumeUrl = applicant.resume;
      } 
      else if (applicant.resume.startsWith('/media/')) {
        resumeUrl = `${baseUrl}${applicant.resume}`;
      } else {
        resumeUrl = `${baseUrl}/media/resumes/${applicant.resume}`;
      }
      
      
      const filename = applicant.resume.split('/').pop() || 'resume';
      
      
      link.href = resumeUrl;
      link.download = `resume_${applicant.name.replace(/\s+/g, '_')}_${filename}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  goBackToJobs() {
    this.activeTab = 'jobList';
    this.selectedJob = null;
  }

  navigateTo(route: string) {
    this.router.navigate([`/admin/${route}`]);
  }

  toggleSelectAll() {
    if (!this.selectedJob?.applicants) return;
    
    this.selectAllApplicants = !this.selectAllApplicants;
    
    
    this.selectedJob.applicants.forEach(applicant => {
      if (applicant.is_shortlisted !== this.selectAllApplicants) {
        this.toggleShortlist(applicant, false);
      }
    });
  }

  toggleShortlist(applicant: Applicant, updateSelectAll: boolean = true) {
    
    applicant.is_shortlisted = !applicant.is_shortlisted;
    
    
    if (updateSelectAll && this.selectedJob?.applicants) {
      this.selectAllApplicants = this.selectedJob.applicants.every(app => app.is_shortlisted);
    }
    
    
    if (applicant.student_id && this.selectedJob?.id) {
      const url = `https://smartrecruit-9ofm.onrender.com/api/student/update-selection/${applicant.student_id}/`;
      
      this.http.post(url, 
        { is_selected: applicant.is_shortlisted },
        { withCredentials: true }
      ).subscribe({
        next: (response) => {
          console.log('Shortlist status updated:', response);
        },
        error: (err) => {
          console.error('Error updating shortlist status:', err);
          
          applicant.is_shortlisted = !applicant.is_shortlisted;
        }
      });
    }
  }

  openAddQuestionModal(job: Job) {
    this.newQuestion = {
      job_id: job.id,
      question_text: '',
      option1: '',
      option2: '',
      option3: '',
      option4: '',
      correct_option: 1
    };
    this.questionError = null;
    this.questionSuccess = null;
    this.showQuestionModal = true;
  }

  closeQuestionModal() {
    this.showQuestionModal = false;
    this.showQuestionsList = false;
    this.newQuestion = {
      job_id: 0,
      question_text: '',
      option1: '',
      option2: '',
      option3: '',
      option4: '',
      correct_option: 1
    };
    this.questionError = null;
    this.questionSuccess = null;
  }

  viewJobQuestions(job: Job) {
    if (!job || !job.id) {
      console.error('Invalid job data');
      return;
    }
    
    
    this.selectedJob = job;
    
    
    this.questionsLoading = true;
    this.showQuestionsList = true;
    this.jobQuestions = [];
    this.questionError = null;
    
    
    this.http.get<any>(`https://smartrecruit-9ofm.onrender.com/api/admin/viewjobapplicants/${job.id}/`, {
      withCredentials: true
    }).subscribe({
      next: (response) => {
        if (response?.applicants?.length > 0) {
          
          const testScheduleId = response.applicants[0]?.test_schedule_id;
          if (testScheduleId) {
            
            this.http.get<any>(`https://smartrecruit-9ofm.onrender.com/api/getquestions/job/${job.id}/`, {
              withCredentials: true
            }).subscribe({
              next: (questionsResponse) => {
                let questions = [];
                if (Array.isArray(questionsResponse)) {
                  questions = questionsResponse;
                } else if (questionsResponse?.questions && Array.isArray(questionsResponse.questions)) {
                  questions = questionsResponse.questions;
                } else {
                  this.questionError = 'No questions found for this test';
                }
                
                
                if (this.selectedJob) {
                  this.selectedJob.questions = questions;
                  console.log('Updated selectedJob with questions:', this.selectedJob);
                }
                
                this.jobQuestions = questions;
                this.questionsLoading = false;
              },
              error: (err) => {
                console.error('Error fetching questions:', err);
                this.questionError = err.error?.message || 'Failed to load questions';
                this.questionsLoading = false;
              }
            });
          } else {
            this.questionError = 'No test schedule found for this job';
            this.questionsLoading = false;
          }
        } else {
          this.questionError = 'No applicants found for this job';
          this.questionsLoading = false;
        }
      },
      error: (err) => {
        console.error('Error fetching job applicants:', err);
        this.questionError = 'Failed to load job information';
        this.questionsLoading = false;
      }
    });
  }

  viewAllTestResults(): void {
    if (!this.selectedJob?.id) {
      console.error('No job selected');
      return;
    }
    
    
    this.router.navigate(['/job', this.selectedJob.id, 'test-results']);
  }

  addQuestion() {
    
    if (!this.newQuestion.question_text || 
        !this.newQuestion.option1 || 
        !this.newQuestion.option2 ||
        !this.newQuestion.option3 ||
        !this.newQuestion.option4) {
      this.questionError = 'All fields are required';
      return;
    }

    if (this.newQuestion.correct_option < 1 || this.newQuestion.correct_option > 4) {
      this.questionError = 'Correct option must be between 1 and 4';
      return;
    }

    this.questionError = null;

    this.http.post('https://smartrecruit-9ofm.onrender.com/api/createquestion/', this.newQuestion, {
      withCredentials: true
    }).subscribe({
      next: (response: any) => {
        console.log('Question added successfully:', response);
        
        
        this.questionSuccess = 'success';
        
        
        this.newQuestion = {
          job_id: this.newQuestion.job_id, 
          question_text: '',
          option1: '',
          option2: '',
          option3: '',
          option4: '',
          correct_option: 1
        };
        
        
        if (this.questionForm) {
          this.questionForm.resetForm();
        }
        
        
        setTimeout(() => {
          this.questionSuccess = null;
          this.showQuestionModal = false;
          
          if (this.selectedJob) {
            this.viewJobQuestions(this.selectedJob);
          }
        }, 2000);
      },
      error: (err) => {
        console.error('Error adding question:', err);
        
        const errorMessage = err.error?.message || 
                           err.error?.error?.message || 
                           'Failed to add question. Please try again.';
        
        this.questionError = errorMessage;
        this.questionSuccess = null;
        
        
        this.cdr.detectChanges();
        
        
        setTimeout(() => {
          this.questionError = null;
          this.cdr.detectChanges();
        }, 5000);
      }
    });
  }

  openScheduleTestModal(job: Job, studentId: number | null | undefined) {
    if (!studentId) {
      this.scheduleError = 'Cannot schedule test: Invalid student ID';
      return;
    }
    
    if (!job.questions || job.questions.length < 10) {
      this.scheduleError = 'Cannot schedule test. The job must have exactly 10 questions.';
      return;
    }
    
    this.testSchedule = {
      job: job.id,
      student: studentId,
      duration_minutes: 60,
      test_type: 'CODING',
      test_link: '',
      test_time: new Date().toISOString().slice(0, 16), // Current date and time in YYYY-MM-DDTHH:MM format
      message: 'Please join the test at the scheduled time. Make sure you have a stable internet connection.'
    };
    this.scheduleError = null;
    this.scheduleSuccess = null;
    this.showScheduleTestModal = true;
  }

  closeScheduleModal() {
    this.showScheduleTestModal = false;
    this.testSchedule = {
      job: 0,
      student: 0,
      test_time: '',
      duration_minutes: 60,
      test_type: 'CODING',
      test_link: '',
      message: ''
    };
    this.scheduleError = null;
    this.scheduleSuccess = null;
    this.schedulingTest = false;
  }

  
  loadJobQuestions(jobId: number) {
    if (!this.selectedJob) return;
    
    this.http.get<any>(`https://smartrecruit-9ofm.onrender.com/api/getquestions/job/${jobId}/`, {
      withCredentials: true
    }).subscribe({
      next: (response) => {
        let questions = [];
        if (Array.isArray(response)) {
          questions = response;
        } else if (response?.questions && Array.isArray(response.questions)) {
          questions = response.questions;
        }
        
        
        if (this.selectedJob) {
          this.selectedJob.questions = questions;
          console.log('Loaded questions for job:', this.selectedJob.id, 'Question count:', questions.length);
        }
      },
      error: (error) => {
        console.error('Error loading job questions:', error);
      }
    });
  }
  
  
  loadJobApplicants(jobId: number) {
    this.jobApplicants = [];
    this.error = null;
    
    this.http.get<any>(`https://smartrecruit-9ofm.onrender.com/api/admin/viewjobapplicants/${jobId}/`, {
      withCredentials: true
    }).subscribe({
      next: (response) => {
        if (response && response.applicants && Array.isArray(response.applicants)) {
          this.jobApplicants = response.applicants;
          
          if (this.selectedJob && this.selectedJob.id === jobId) {
            this.selectedJob.applicants = [...this.jobApplicants];
          }
        } else {
          this.error = 'Invalid response format';
        }
      },
      error: (error) => {
        console.error('Error loading job applicants:', error);
        this.error = error.error?.message || 'Failed to load job applicants';
      }
    });
  }

  
  viewJobApplicants(job: Job) {
    this.selectedJob = job;
    this.activeTab = 'jobApplicants';
    this.loadJobApplicants(job.id);
  }

  
  async scheduleTest() {
    if (!this.selectedJob) {
      this.scheduleError = 'No job selected';
      return;
    }

    
    const selectedApplicants = this.jobApplicants.filter(
      applicant => applicant.is_shortlisted && applicant.application_id
    );

    if (selectedApplicants.length === 0) {
      this.scheduleError = 'No shortlisted applicants found or missing application IDs';
      return;
    }

    this.schedulingTest = true;
    this.scheduleError = null;
    this.scheduleSuccess = null;

    
    let successCount = 0;
    const errors: string[] = [];

    try {
      for (const applicant of selectedApplicants) {
        try {
          
          const testDateTime = new Date(this.testSchedule.test_time);
          const formattedDateTime = testDateTime.toISOString();
          
          const testData = {
            application_id: applicant.application_id,
            test_time: formattedDateTime,
            duration_minutes: this.testSchedule.duration_minutes || 60, // Default to 60 minutes if not set
            message: this.testSchedule.message || 'Please join the test at the scheduled time.'
          };
          
          console.log('Scheduling test with data:', JSON.stringify(testData, null, 2));

          await this.http.post('https://smartrecruit-9ofm.onrender.com/api/admin/schedule-test/', testData, {
            withCredentials: true,
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
            }
          }).toPromise();
          
          successCount++;
        } catch (error: any) {
          console.error('Error scheduling test for application', applicant.application_id, error);
          
          let errorMessage = `Student ${applicant.name || 'Unknown'}: `;
          
          if (error.status === 400) {
            
            if (error.error) {
              if (typeof error.error === 'string') {
                errorMessage += error.error;
              } else if (error.error.error) {
                errorMessage += error.error.error;
              } else if (typeof error.error === 'object') {
                
                const errorMessages = Object.values(error.error).flat();
                errorMessage += errorMessages.join(', ');
              } else {
                errorMessage += 'Invalid request data';
              }
            } else {
              errorMessage += 'Bad request';
            }
          } else if (error.status === 404) {
            errorMessage += 'Application not found';
          } else if (error.status) {
            errorMessage += `Error ${error.status}: ${error.statusText || 'Unknown error'}`;
          } else {
            errorMessage += 'Network or server error';
          }
          
          errors.push(errorMessage);
        }
      }

      if (successCount > 0) {
        this.scheduleSuccess = `Successfully scheduled tests for ${successCount} shortlisted applicants`;
        
        
        this.testSchedule = {
          job: 0,
          student: 0,
          test_time: '',
          duration_minutes: 60,
          test_type: 'CODING',
          test_link: '',
          message: 'Please join the test at the scheduled time. Make sure you have a stable internet connection.'
        };
        
        
        if (this.selectedJob) {
          this.loadJobApplicants(this.selectedJob.id);
        }
        
       
        setTimeout(() => {
          this.closeScheduleModal();
        }, 2000);
      }
      
      if (errors.length > 0) {
        this.scheduleError = `Failed to schedule for ${errors.length} applicant(s). ` + 
          errors.map((e, i) => `${i + 1}. ${e}`).join('; ');
      }
    } catch (error: any) {
      console.error('Unexpected error in scheduleTest:', error);
      this.scheduleError = 'An unexpected error occurred while scheduling tests. Please try again.';
    } finally {
      this.schedulingTest = false;
    }
  }

  
  hasSelectedApplicants(): boolean {
    if (!this.jobApplicants || this.jobApplicants.length === 0) return false;
    return this.jobApplicants.some(
      applicant => applicant.is_shortlisted && applicant.student_id
    );
  }

  
  hasShortlistedApplicants(): boolean {
    console.log('Job applicants:', this.jobApplicants);
    if (!this.jobApplicants || this.jobApplicants.length === 0) {
      console.log('No job applicants or empty array');
      return false;
    }
    const hasShortlisted = this.jobApplicants.some(applicant => {
      console.log('Checking applicant:', applicant);
      console.log('is_shortlisted:', applicant.is_shortlisted, 'student_id:', applicant.student_id);
      return applicant.is_shortlisted && applicant.student_id;
    });
    console.log('Has shortlisted applicants:', hasShortlisted);
    return hasShortlisted;
  }

  
  getShortlistedCount(): number {
    if (!this.jobApplicants || this.jobApplicants.length === 0) return 0;
    return this.jobApplicants.filter(applicant => 
      applicant.is_shortlisted && applicant.student_id
    ).length;
  }

  canScheduleTest(job: Job | null): boolean {
    console.log('canScheduleTest called with job:', job);
    if (!job) {
      console.log('No job selected');
      return false;
    }
    
    
    console.log('Job questions:', job.questions);
    const questionCount = job.questions?.length || 0;
    const hasEnoughQuestions = questionCount === 10;
    console.log(`Question count: ${questionCount}, hasEnoughQuestions: ${hasEnoughQuestions}`);
    
    
    const hasShortlisted = this.hasSelectedApplicants();
    console.log('Has shortlisted applicants:', hasShortlisted);
    
    const canSchedule = hasEnoughQuestions && hasShortlisted;
    console.log('Can schedule test:', canSchedule);
    
    return canSchedule;
  }

  toggleUserApproval(student: Student, event: Event): void {
    event.stopPropagation(); 
    
    
    const originalAllowStatus = student.allow;
    student.allow = student.allow === 'allow' ? null : 'allow';
    
    const url = `https://smartrecruit-9ofm.onrender.com/api/admin/toggle-approval/${student.id}/`;
    
    this.http.post(url, {}, { withCredentials: true })
      .subscribe({
        next: (response: any) => {
          
          const studentIndex = this.students.findIndex(s => s.id === student.id);
          if (studentIndex !== -1) {
            this.students[studentIndex].allow = response.is_approved ? 'allow' : null;
            this.cdr.detectChanges();
          }
        },
        error: (error: any) => {
          console.error('Error toggling user approval:', error);
          
          student.allow = originalAllowStatus;
          this.cdr.detectChanges();
          
          
          this.error = error.error?.message || 'Failed to update user approval status';
          window.setTimeout(() => this.error = null, 5000);
        }
      });
  }

  logout() {
    this.authService.logout();
  }

  deleteJob(jobId: number, event: Event) {
    event.stopPropagation();
    if (confirm('Are you sure you want to delete this job? This action cannot be undone.')) {
      this.http.delete(`https://smartrecruit-9ofm.onrender.com/api/jobs/crud/${jobId}/`, { 
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        }
      }).subscribe({
        next: () => {
          
          this.jobs = this.jobs.filter(job => job.id !== jobId);
          
          if (this.selectedJob && this.selectedJob.id === jobId) {
            this.selectedJob = null;
          }
          
          alert('Job deleted successfully');
        },
        error: (error) => {
          console.error('Error deleting job:', error);
          if (error.status === 401) {
            
            alert('Your session has expired. Please log in again.');
            this.router.navigate(['/login']);
          } else if (error.status === 403) {
            
            alert('You do not have permission to delete jobs.');
          } else {
            alert('Failed to delete job. Please try again.');
          }
        }
      });
    }
  }

  editJob(job: Job, event: Event) {
    event.stopPropagation();
    this.router.navigate(['/admin/edit-job', job.id]);
  }

  downloadApplicants(): void {
    
    console.log('Downloading applicants...');
  }

  sendBulkEmails(): void {
    
    console.log('Sending bulk emails...');
  }

  getScoreBadgeClass(score: number | null | undefined): string {
    if (score === null || score === undefined) return 'bg-secondary';
    if (score >= 70) return 'bg-success';
    if (score >= 40) return 'bg-warning';
    return 'bg-danger';
  }


  
  ngOnDestroy(): void {
    if (this.destroy$) {
      this.destroy$.next();
      this.destroy$.complete();
    }
  }
}

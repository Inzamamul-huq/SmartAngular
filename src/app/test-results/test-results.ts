import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

interface TestResponse {
  question_text: string;
  selected_option: number;
  correct_option: number;
  is_correct: boolean;
}

interface TestDetails {
  id: number;
  test_time: string;
  is_completed: boolean;
  score: number;
  responses: TestResponse[];
}

interface JobInfo {
  id: number;
  title: string;
}

interface TestResult {
  status: string;
  test: TestDetails | null;
  student?: {
    id: number;
    name: string;
    email: string;
  };
  job?: JobInfo;
}

export interface JobDetails {
  title: string;
  description: string;
  date: string;
}

interface AllTestResults {
  status: string;
  results: TestResult[];
  total: number;
  average_score: number;
}

@Component({
  selector: 'app-test-results',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterLink, FormsModule],
  templateUrl: './test-results.html',
  styleUrls: ['./test-results.component.scss']
})
export class TestResults implements OnInit {
  testResults: TestResult | null = null;
  allTestResults: AllTestResults | null = null;
  loading = true;
  error: string | null = null;
  viewMode: 'single' | 'all' = 'single';
  selectedStudents: string[] = [];
  showJobModal = false;
  jobDetails: {
    title: string;
    date: string;
    description: string;
  } = {
    title: '',
    date: new Date().toISOString().split('T')[0],
    description: ''
  };
  sending = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

 
  toggleStudentSelection(email: string | undefined) {
    if (!email) return;
    const index = this.selectedStudents.indexOf(email);
    if (index === -1) {
      this.selectedStudents.push(email);
    } else {
      this.selectedStudents.splice(index, 1);
    }
  }

  isStudentSelected(email: string | undefined): boolean {
    return email ? this.selectedStudents.includes(email) : false;
  }

  hasSelectedStudents(): boolean {
    return this.selectedStudents.length > 0;
  }

 
  openSendJobModal() {
    
    if (!this.jobDetails.title && this.testResults?.job?.title) {
      this.jobDetails.title = this.testResults.job.title;
    }
    this.showJobModal = true;
    console.log('Job modal opened with job details:', this.jobDetails);
    console.log('Test results job data:', this.testResults?.job);
  }

  closeSendJobModal() {
    this.testResults = null;
    this.jobDetails = {
      title: '',
      description: '',
      date: new Date().toISOString().split('T')[0]
    };
    this.showJobModal = false;
  }

  
  sendJobDetails() {
    if (this.sending) return;
    
    
    if (!this.jobDetails.title || !this.jobDetails.date) {
      alert('Please fill in all required job details');
      return;
    }

    
    let jobId: number | null = null;
    
    
    if (this.testResults?.job?.id) {
      jobId = this.testResults.job.id;
    } 
   
    else if (this.route.snapshot.paramMap.get('id')) {
      const id = this.route.snapshot.paramMap.get('id');
      if (id && !isNaN(Number(id))) {
        jobId = Number(id);
      }
    }
    
    
    if (!jobId) {
      console.error('No valid job ID found');
      alert('Error: Could not determine the job. Please try again or contact support.');
      return;
    }

    
    if (this.selectedStudents.length === 0) {
      alert('Please select at least one student');
      return;
    }

    this.sending = true;
    
    
    const formatDate = (dateString: string): string => {
      try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) throw new Error('Invalid date');
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      } catch (e) {
        console.error('Error formatting date:', e);
        return new Date().toISOString().split('T')[0]; // Fallback to today
      }
    };
    
    const payload = {
      student_emails: this.selectedStudents,
      job_id: jobId,
      title: this.jobDetails.title,
      description: this.jobDetails.description || '',
      date: formatDate(this.jobDetails.date)
    };
    
    console.log('Sending job details:', payload);

    this.http.post('/api/job-opportunities/', payload, { 
      withCredentials: true,
      headers: { 'Content-Type': 'application/json' }
    }).subscribe({
      next: (response: any) => {
        console.log('Job opportunities response:', response);
        if (response.status === 'success' || response.status === 'info') {
          const count = response.opportunity_count || this.selectedStudents.length;
          const message = response.message || `Successfully sent job opportunities to ${count} student(s)!`;
          alert(message);
          
          
          this.closeSendJobModal();
          this.selectedStudents = [];
          this.jobDetails = {
            title: this.testResults?.job?.title || '',
            date: new Date().toISOString().split('T')[0],
            description: ''
          };
        } else {
          throw new Error(response.message || 'Failed to send job opportunities');
        }
      },
      error: (error) => {
        console.error('Error sending job opportunities:', error);
        const errorMessage = error.error?.message || error.message || 'Failed to send job opportunities. Please try again.';
        alert(`Error: ${errorMessage}`);
      },
      complete: () => {
        this.sending = false;
      }
      });
  }

  ngOnInit(): void {
    
    const url = this.router.url;
    if (url.includes('/test-results/')) {
      
      const testScheduleId = this.route.snapshot.paramMap.get('id');
      if (testScheduleId) {
        this.viewMode = 'single';
        this.fetchTestResults(parseInt(testScheduleId, 10));
      } else {
        this.error = 'Invalid test ID';
        this.loading = false;
      }
    } else if (url.includes('/job/') && url.includes('/test-results')) {
      
      const jobId = this.route.snapshot.paramMap.get('id') || this.route.snapshot.parent?.paramMap.get('id');
      if (jobId) {
        this.viewMode = 'all';
        this.fetchAllTestResults(parseInt(jobId, 10));
      } else {
        this.error = 'Invalid job ID';
        this.loading = false;
      }
    } else {
      this.error = 'Invalid URL. Could not determine test results to show.';
      this.loading = false;
    }
  }

  
  getCorrectAnswersCount(): number {
    if (!this.testResults?.test?.responses) return 0;
    return this.testResults.test.responses.filter(r => r.is_correct).length;
  }

  fetchTestResults(testScheduleId: number): void {
    this.loading = true;
    this.error = null;
    
    console.log(`Fetching test results for schedule ID: ${testScheduleId}`);
    
    this.http.get<TestResult>(`/api/test/results/${testScheduleId}/`)
      .subscribe({
        next: (response: any) => {
          console.log('Test results API response:', response);
          if (response.status === 'success') {
            this.testResults = response;
            console.log('Test results set:', this.testResults);
            
            
            if (this.testResults) {
              console.log('testResults.job exists:', !!this.testResults.job);
              console.log('testResults.job:', this.testResults.job);
              console.log('testResults.test:', this.testResults.test);
            }
            
            
            if (response.job) {
              this.jobDetails = {
                title: response.job.title || '',
                date: new Date().toISOString().split('T')[0],
                description: ''
              };
              console.log('Job form pre-filled with:', this.jobDetails);
            } else {
              console.warn('No job data found in test results');
              
              this.jobDetails = {
                title: 'Job Opportunity',
                date: new Date().toISOString().split('T')[0],
                description: ''
              };
            }
          } else {
            this.error = 'Failed to load test results';
          }
          this.loading = false;
        },
        error: (err) => {
          console.error('Error fetching test results:', err);
          this.error = 'Error loading test results. Please try again.';
          this.loading = false;
        }
      });
  }

  fetchAllTestResults(jobId: number): void {
    this.loading = true;
    this.error = null;
    console.log('1. Starting to fetch all test results for job ID:', jobId);
    
    
    const jobsUrl = '/api/jobs/';
    console.log('2. Fetching jobs list from:', jobsUrl);
    
    this.http.get<any>(jobsUrl).subscribe({
      next: (jobsResponse) => {
        console.log('3. Jobs list response:', jobsResponse);
        
        
        const job = Array.isArray(jobsResponse) ? 
          jobsResponse.find((j: any) => j.id === jobId) : null;
        
        if (!job) {
          console.error('4. Job not found in the jobs list');
          this.error = 'Job not found';
          this.loading = false;
          return;
        }
        
        console.log('4. Found job:', job);
        
       
        const applicantsUrl = `https://smartrecruit-l27g.onrender.com/api/admin/viewjobapplicants/${jobId}/`;
        console.log('5. Fetching applicants from:', applicantsUrl);
        
        this.http.get<any>(applicantsUrl).subscribe({
          next: (response) => {
            console.log('6. Applicants API Response:', response);
            
            if (response.status === 'success') {
              const applicants = response.applicants || [];
              console.log(`7. Found ${applicants.length} applicants`);
              

              const results: TestResult[] = [];
              
              if (Array.isArray(applicants)) {
                applicants.forEach((applicant: any, index: number) => {
                  console.log(`   Processing applicant ${index + 1}:`, {
                    name: applicant.name,
                    student_id: applicant.student_id,
                    has_test_schedule: !!applicant.test_schedule,
                    test_schedule: applicant.test_schedule
                  });
                  
                  results.push({
                    status: 'success',
                    student: {
                      id: applicant.student_id,
                      name: applicant.name,
                      email: applicant.email
                    },
                    test: applicant.test_schedule ? {
                      id: applicant.test_schedule.test_schedule_id,
                      test_time: applicant.test_schedule.test_time,
                      is_completed: applicant.test_schedule.test_completed || false,
                      score: applicant.test_schedule.test_score || 0,
                      responses: []
                    } : null
                  });
                });
              }

              this.allTestResults = {
                status: 'success',
                results: results,
                total: response.total_applicants || results.length,
                average_score: this.calculateAverageScore(results)
              };
              
              console.log('8. Final processed results:', this.allTestResults);
              console.log('9. Total applicants processed:', results.length);
            } else {
              console.error('10. API returned error status:', response);
              this.error = response.message || 'Failed to load test results';
            }
            this.loading = false;
          },
          error: (err) => {
            console.error('11. Error in applicants API call:', {
              status: err.status,
              error: err.error,
              url: err.url
            });
            this.error = `Error loading test results: ${err.statusText || 'Unknown error'}`;
            this.loading = false;
          }
        });
      },
      error: (jobsErr) => {
        console.error('12. Error fetching jobs list:', {
          status: jobsErr.status,
          error: jobsErr.error,
          url: jobsErr.url
        });
        this.error = `Error loading jobs list: ${jobsErr.statusText || 'Unknown error'}`;
        this.loading = false;
      }
    });
  }

  private calculateAverageScore(results: TestResult[]): number {
    if (!results || results.length === 0) return 0;
    
    const validScores = results
      .filter(r => r.test?.score !== undefined && r.test?.score !== null)
      .map(r => r.test!.score);
      
    if (validScores.length === 0) return 0;
    
    const sum = validScores.reduce((a, b) => a + b, 0);
    return parseFloat((sum / validScores.length).toFixed(2));
  }

  viewSingleResult(testId: number): void {
    if (!testId) return;
    this.router.navigate(['/test-results', testId]);
  }

  getScoreBadgeClass(score: number | null | undefined): string {
    const scoreValue = score || 0;
    if (scoreValue >= 70) return 'bg-success';
    if (scoreValue >= 50) return 'bg-warning';
    return 'bg-danger';
  }

  getCompletionBadgeClass(isCompleted: boolean): string {
    return isCompleted ? 'bg-success' : 'bg-warning';
  }

  formatTestTime(testTime: string | null | undefined): string {
    if (!testTime) return 'N/A';
    const date = new Date(testTime);
    return date.toLocaleString(); 
  }
}

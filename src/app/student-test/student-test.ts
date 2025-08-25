import { Component, OnInit, OnDestroy, HostListener, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { interval, Subject, fromEvent } from 'rxjs';
import { takeUntil, take } from 'rxjs/operators';

interface Question {
  id: number;
  question_text: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
}

interface QuestionsResponse {
  status: string;
  questions: Question[];
  total_questions: number;
  job_title: string;
}

@Component({
  selector: 'app-student-test',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule, RouterModule],
  templateUrl: './student-test.html',
  styleUrls: ['./student-test.css']
})
export class StudentTest implements OnInit, OnDestroy {
  @ViewChild('testContainer') testContainer!: ElementRef;
  apiBase = 'https://smartrecruit-9ofm.onrender.com/api';
  scheduleId!: number;
  loading = false;
  error: string | null = null;
  info: string | null = null;
  jobTitle = '';
  
  
  timeLeft: number = 0;
  timer: any;
  testStartTime: Date | null = null;
  testEndTime: Date | null = null;
  private destroy$ = new Subject<void>();
  questions: Question[] = [];
  isFullscreen = false;
  answers: { [key: string]: number } = {};
  submitting = false;
  submitted = false;
  result: { score: number; total_questions: number; correct_answers: number; wrong_answers: number } | null = null;

  constructor(
    private route: ActivatedRoute, 
    private http: HttpClient, 
    private auth: AuthService,
    private router: Router,
    private elementRef: ElementRef
  ) {
   
    document.addEventListener('contextmenu', this.preventRightClick);
    document.addEventListener('keydown', this.preventShortcuts);
  }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('scheduleId');
    this.scheduleId = idParam ? parseInt(idParam, 10) : 0;
    if (!this.scheduleId) {
      this.error = 'Invalid test schedule ID';
      return;
    }
    this.verifyTestSchedule();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.timer) {
      clearInterval(this.timer);
    }
    
   
    document.removeEventListener('keydown', this.preventShortcuts);
    document.removeEventListener('fullscreenchange', this.checkFullScreen);
    document.removeEventListener('webkitfullscreenchange', this.checkFullScreen);
    document.removeEventListener('mozfullscreenchange', this.checkFullScreen);
    document.removeEventListener('MSFullscreenChange', this.checkFullScreen);
    
    if (this.testStartTime && this.testEndTime) {
      const now = new Date();
      if (now < this.testEndTime) {
        const duration = (this.testEndTime.getTime() - this.testStartTime.getTime()) / (60 * 1000);
        localStorage.setItem(`testInProgress_${this.scheduleId}`, JSON.stringify({
          startTime: this.testStartTime.toISOString(),
          duration: duration
        }));
      } else {
        localStorage.removeItem(`testInProgress_${this.scheduleId}`);
      }
    }
  }

  
  private preventRightClick = (e: MouseEvent) => {
    e.preventDefault();
    return false;
  };

  
  private preventShortcuts = (e: KeyboardEvent) => {
    const allowedKeys = [
      'Tab', 'Enter', 'Escape', 'ArrowUp', 'ArrowDown', 
      'ArrowLeft', 'ArrowRight', 'Backspace', 'Delete',
      'Home', 'End', 'PageUp', 'PageDown'
    ];
    
    if (e.key === 'Meta' || e.metaKey) {
      e.preventDefault();
      this.handleViolation();
      return false;
    }
    
    if ((e.key.length === 1 && !e.ctrlKey && !e.metaKey) || 
        allowedKeys.includes(e.key)) {
      return true;
    }
    
    
    if (e.key.startsWith('F') || e.key === 'PrintScreen') {
      e.preventDefault();
      this.handleViolation();
      return false;
    }
    
    
    e.preventDefault();
    return false;
  };

  
  private checkFullScreen = () => {
    this.updateFullscreenState();
    if (!this.isFullscreen && !this.submitted) {
      
      this.info = 'Test submitted due to exiting fullscreen mode.';
      this.submit();
    }
  };

  
  private handleViolation() {
    this.info = 'Test terminated due to violation of test rules.';
    
    this.submit();
  }

  
  private enterFullscreen(element: any) {
    const promise = element.requestFullscreen || 
                   element.webkitRequestFullscreen || 
                   element.mozRequestFullScreen || 
                   element.msRequestFullscreen;
    
    if (promise) {
      promise.call(element).then(() => {
        this.isFullscreen = true;
      }).catch((err: Error) => {
        console.error('Error attempting to enable fullscreen:', err);
        this.info = 'Please allow fullscreen mode to continue with the test.';
      });
    }
  }

  
  private updateFullscreenState() {
    this.isFullscreen = !!(document.fullscreenElement || 
                          (document as any).webkitFullscreenElement ||
                          (document as any).mozFullScreenElement ||
                          (document as any).msFullscreenElement);
  }

  private verifyTestSchedule(): void {
    this.loading = true;
    
    this.http.get<any>(`${this.apiBase}/test-schedule/${this.scheduleId}/`, {
      withCredentials: true
    }).subscribe({
      next: (schedule) => {
        const durationMinutes = schedule.duration_minutes || 60;
        const testTime = new Date(schedule.test_time);
        const now = new Date();
        
        const testEndTime = new Date(testTime.getTime() + (durationMinutes * 60 * 1000));
        
        if (now > testEndTime) {
          this.loading = false;
          this.error = `The test window has ended on ${testEndTime.toLocaleString()}.`;
          return;
        }
        
        const testInProgress = localStorage.getItem(`testInProgress_${this.scheduleId}`);
        
        if (testInProgress) {
          const { startTime, duration } = JSON.parse(testInProgress);
          const endTime = new Date(new Date(startTime).getTime() + (duration * 60 * 1000));
          
          if (now < endTime) {
            this.testStartTime = new Date(startTime);
            this.testEndTime = endTime;
            this.timeLeft = Math.max(0, Math.floor((endTime.getTime() - now.getTime()) / 1000));
            this.jobTitle = schedule.application?.job?.title || 'Test';
            this.startTimer();
            this.fetchQuestions();
            return;
          } else {
            localStorage.removeItem(`testInProgress_${this.scheduleId}`);
          }
        }
        
        this.testStartTime = now;
        this.testEndTime = new Date(now.getTime() + (durationMinutes * 60 * 1000));
        this.timeLeft = durationMinutes * 60;
        this.jobTitle = schedule.application?.job?.title || 'Test';
        
        localStorage.setItem(`testInProgress_${this.scheduleId}`, JSON.stringify({
          startTime: this.testStartTime.toISOString(),
          duration: durationMinutes
        }));
        
        this.startTimer();
        this.fetchQuestions();
      },
      error: (err) => {
        console.error('Error fetching test schedule:', err);
        this.error = 'Failed to load test schedule. Please try again.';
        this.loading = false;
      }
    });
  }
  
  private startTimer(): void {
    this.timer = setInterval(() => {
      if (this.timeLeft > 0) {
        this.timeLeft--;
      } else {
        this.autoSubmit();
      }
    }, 1000);
  }
  
  private autoSubmit(): void {
    clearInterval(this.timer);
    if (!this.submitted && !this.submitting) {
      this.info = 'Time\'s up! Submitting your test...';
      this.submit();
    }
  }
  
  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  fetchQuestions() {
    this.loading = true;
    this.error = null;
    this.info = 'Please wait, preparing your test environment...';
    
    
    document.addEventListener('fullscreenchange', this.checkFullScreen);
    document.addEventListener('webkitfullscreenchange', this.checkFullScreen);
    document.addEventListener('mozfullscreenchange', this.checkFullScreen);
    document.addEventListener('MSFullscreenChange', this.checkFullScreen);
    
    
    setTimeout(() => {
      const element = this.testContainer?.nativeElement || document.documentElement;
      this.enterFullscreen(element);
    }, 1000);
    
    
    document.onselectstart = () => false;
    
    
    document.oncopy = () => false;
    document.oncut = () => false;
    document.onpaste = () => false;

    this.http
      .get<QuestionsResponse>(`${this.apiBase}/getquestions/schedule/${this.scheduleId}/`, { withCredentials: true })
      .subscribe({
        next: (res) => {
          if (res && res.status === 'success' && Array.isArray(res.questions)) {
            this.questions = res.questions.slice(0, 10);
            this.jobTitle = res.job_title || '';
            
            this.answers = {};
            for (const q of this.questions) {
              this.answers[q.id] = 0; 
            }
          } else {
            this.error = 'No questions available';
          }
          this.loading = false;
        },
        error: (err) => {
          if (err.status === 403) {
            this.info = err.error?.message || 'Your test is not started yet. Please try at the scheduled time.';
          } else if (err.status === 404) {
            this.error = 'Test schedule not found or already completed';
          } else {
            this.error = err.error?.message || 'Failed to load questions';
          }
          this.loading = false;
        }
      });
  }
  

  allAnswered(): boolean {
    
    return true;
  }

  selectOption(qid: number, option: number) {
    this.answers[String(qid)] = option;
  }

  submit() {
    if (this.submitting) return;
    
    this.submitting = true;
    this.error = null;
    
    
    this.info = null;

    const url = `${this.apiBase}/submitanswers/${this.scheduleId}/`;
    const user = this.auth.getUser();
    if (!user || !user.email) {
      this.error = 'User not authenticated';
      this.submitting = false;
      return;
    }
    
    const payload = {
      student_email: user.email.toLowerCase().trim(),
      answers: this.questions.map(q => {
        const answer = this.answers[String(q.id)];
        return {
          question_id: q.id, 
          selected_option: (answer && answer >= 1 && answer <= 4) ? answer : 0
        };
      })
    };
    
    console.log('=== Test Submission Debug ===');
    console.log('URL:', url);
    console.log('Payload:', JSON.stringify(payload, null, 2));
    console.log('With Credentials:', true);
    
    interface TestSubmissionResponse {
      status: string;
      message?: string;
      result?: {
        score: number;
        total_questions: number;
        correct_answers: number;
        wrong_answers: number;
      };
    }
    
    this.http
      .post<TestSubmissionResponse>(url, payload, {
        withCredentials: true,
        observe: 'response'
      })
      .subscribe({
        next: (response) => {
          const responseBody = response.body;
          if (responseBody?.status === 'success') {
            localStorage.removeItem(`testInProgress_${this.scheduleId}`);
            this.result = responseBody.result || null;
            this.submitted = true;
          } else {
            this.error = responseBody?.message || 'Submission failed';
          }
          this.submitting = false;
        },
        error: (err) => {
          console.error('=== Test Submission Error ===');
          console.error('Error:', err);
          console.error('Status:', err.status);
          console.error('Error Message:', err.error?.message || 'No error message');
          console.error('Error Details:', err.error);
          
          this.error = null;
          this.info = null;
          
          if (err.status === 403) {
            if (err.error?.message) {
              this.info = err.error.message;
            } else {
              this.error = 'You are not authorized to submit this test.';
            }
          } else if (err.status === 404) {
            this.error = 'Test schedule not found or already completed';
          } else if (err.status === 400) {
            this.error = err.error?.message || 'Invalid request. Please check your answers and try again.';
          } else {
            this.error = 'An unexpected error occurred while submitting the test. Please try again.';
          }
          
          this.submitting = false;
        }
      });
  }
}

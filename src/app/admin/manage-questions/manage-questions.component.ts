import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';

interface MCQQuestion {
  id?: number;
  job_id: number;
  question_text: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correct_option: number;
}

@Component({
  selector: 'app-manage-questions',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './manage-questions.component.html',
  styleUrls: ['./manage-questions.component.css']
})
export class ManageQuestionsComponent implements OnInit {
  questions: MCQQuestion[] = [];
  questionForm: FormGroup;
  jobId: number | null = null;
  loading = true;
  error: string | null = null;
  viewMode: 'list' | 'add' = 'list';
  editingQuestion: MCQQuestion | null = null;
  maxQuestionsReached = false;
  readonly MAX_QUESTIONS = 10;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {
    this.questionForm = this.fb.group({
      question_text: ['', [Validators.required, Validators.minLength(5)]],
      option1: ['', Validators.required],
      option2: ['', Validators.required],
      option3: ['', Validators.required],
      option4: ['', Validators.required],
      correct_option: [1, [Validators.required, Validators.min(1), Validators.max(4)]]
    });
  }

  ngOnInit(): void {
    this.jobId = +this.route.snapshot.paramMap.get('id')!;
    this.route.queryParams.subscribe(params => {
      if (params['addNew'] === 'true') {
        this.addNewQuestion();
      }
    });
    
    if (this.jobId) {
      this.loadQuestions();
    } else {
      this.error = 'No job ID provided';
      this.loading = false;
    }
  }

  loadQuestions(): void {
    this.loading = true;
    this.error = null;

    this.http.get(`https://smartrecruit-9ofm.onrender.com/api/getquestions/job/${this.jobId}/`, {
      withCredentials: true
    }).subscribe({
      next: (response: any) => {
        if (response.status === 'success') {
          this.questions = response.questions || [];
          this.maxQuestionsReached = this.questions.length >= this.MAX_QUESTIONS;
        } else {
          this.questions = [];
          this.error = response.message || 'No questions found for this job';
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading questions:', error);
        this.error = error.error?.message || 'Failed to load questions. Please try again.';
        this.loading = false;
      }
    });
  }

  addNewQuestion(): void {
    if (this.maxQuestionsReached) {
      this.error = `Maximum limit of ${this.MAX_QUESTIONS} questions reached for this job.`;
      return;
    }
    this.viewMode = 'add';
    this.editingQuestion = null;
    this.questionForm.reset({
      correct_option: 1
    });
  }

  editQuestion(question: MCQQuestion): void {
    this.viewMode = 'add';
    this.editingQuestion = { ...question };
    this.questionForm.patchValue({
      question_text: question.question_text,
      option1: question.option1,
      option2: question.option2,
      option3: question.option3,
      option4: question.option4,
      correct_option: question.correct_option
    });
  }

  onSubmit(): void {
    if (this.questionForm.invalid || !this.jobId) {
      return;
    }

    // Format the data to match backend expectations
    const formValue = this.questionForm.value;
    const questionData: MCQQuestion & { job_id: number } = {
      question_text: formValue.question_text,
      option1: formValue.option1,
      option2: formValue.option2,
      option3: formValue.option3,
      option4: formValue.option4,
      correct_option: parseInt(formValue.correct_option, 10),
      job_id: this.jobId
    };

    if (this.editingQuestion && this.editingQuestion.id) {
      const questionWithId = { ...questionData, id: this.editingQuestion.id };
      this.http.put(`https://smartrecruit-9ofm.onrender.com/api/crud/questions/${this.editingQuestion.id}/`, 
        questionWithId,
        { 
          withCredentials: true,
          headers: { 'Content-Type': 'application/json' }
        }
      ).subscribe({
        next: () => {
          this.loadQuestions();
          this.viewMode = 'list';
          this.questionForm.reset();
          this.editingQuestion = null;
        },
        error: (error) => {
          console.error('Error updating question:', error);
          this.error = error.error?.message || 'Failed to update question. Please try again.';
        }
      });
    } else {
      // Create new question
      this.http.post('https://smartrecruit-9ofm.onrender.com/api/createquestion/', 
        questionData,
        { withCredentials: true }
      ).subscribe({
        next: () => {
          this.loadQuestions();
          this.viewMode = 'list';
          this.questionForm.reset();
        },
        error: (error) => {
          console.error('Error creating question:', error);
          if (error.error?.message?.includes('Maximum limit')) {
            this.maxQuestionsReached = true;
            this.viewMode = 'list';
          }
          this.error = error.error?.message || 'Failed to create question. Please try again.';
        }
      });
    }
  }

  deleteQuestion(id: number): void {
    if (confirm('Are you sure you want to delete this question? This action cannot be undone.')) {
      this.loading = true;
      this.http.delete(
        `https://smartrecruit-9ofm.onrender.com/api/crud/questions/${id}/`,
        { 
          withCredentials: true,
          observe: 'response'  // Get full response to check status
        }
      ).subscribe({
        next: (response: any) => {
          // If we get here, the delete was successful
          this.loadQuestions();
          // Reset maxQuestionsReached flag since we've deleted a question
          this.maxQuestionsReached = this.questions.length - 1 >= this.MAX_QUESTIONS;
        },
        error: (error) => {
          console.error('Error deleting question:', error);
          this.error = error.error?.message || 'Failed to delete question. Please try again.';
          this.loading = false;
        }
      });
    }
  }

  cancelEdit(): void {
    this.viewMode = 'list';
    this.questionForm.reset();
    this.editingQuestion = null;
  }

  goBack(): void {
    this.router.navigate(['/admindashboard']);
  }
}

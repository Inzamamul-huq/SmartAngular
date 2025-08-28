import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

interface Experience {
  id: number;
  company_name: string;
  division_name: string;
  student_email: string;
  submitted_at: string;
  overall_experience: string;
  tips?: string;
  aptitude_questions?: string;
  technical_questions?: string;
  hr_questions?: string;
  gd_topics?: string;
  aptitude_attachment?: string;
  technical_attachment?: string;
  hr_attachment?: string;
  gd_attachment?: string;
  aptitude_conducted?: boolean;
  technical_conducted?: boolean;
  gd_conducted?: boolean;
  hr_conducted?: boolean;
}

@Component({
  selector: 'app-experiences',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './experiences.html',
  styleUrls: ['./experiences.css']
})
export class Experiences implements OnInit {
  experiences: Experience[] = [];
  loading = false;
  error: string | null = null;
  selectedExperience: Experience | null = null;

  constructor(
    private http: HttpClient,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    this.loadExperiences();
  }

  loadExperiences(): void {
    this.loading = true;
    this.error = null;
    
    this.http.get<Experience[]>('https://smartrecruit-9ofm.onrender.com/api/interview-questions/experience/all/')
      .subscribe({
        next: (data) => {
          this.experiences = data;
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading experiences:', err);
          this.error = 'Failed to load experiences. Please try again later.';
          this.loading = false;
        }
      });
  }

  openExperienceModal(experience: Experience, content: any): void {
    this.selectedExperience = experience;
    this.modalService.open(content, { size: 'lg' });
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  hasAttachments(): boolean {
    if (!this.selectedExperience) return false;
    return !!(this.selectedExperience.aptitude_attachment || 
             this.selectedExperience.technical_attachment || 
             this.selectedExperience.hr_attachment || 
             this.selectedExperience.gd_attachment);
  }

  getAttachmentUrl(attachmentPath: string): string {
    if (!attachmentPath) return '';
    if (attachmentPath.startsWith('http')) {
      return attachmentPath;
    }
    return `https://smartrecruit-9ofm.onrender.com${attachmentPath}`;
  }

  getFileName(path: string): string {
    if (!path) return '';
    const pathParts = path.split(/[\\/]/);
    return pathParts[pathParts.length - 1];
  }
}

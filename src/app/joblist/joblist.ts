import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-joblist',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './joblist.html',
  styleUrl: './joblist.css'
})
export class Joblist implements OnInit {
  jobs: any[] = [];
  newJob = { title: '', description: '' };

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchJobs();
  }

  fetchJobs(): void {
    this.http.get<any[]>('https://smartrecruit-9ofm.onrender.com/api/jobs/').subscribe((res) => {
      this.jobs = res;
    });
  }

  addJob(): void {
    if (!this.newJob.title || !this.newJob.description) return;
    this.http.post('https://smartrecruit-9ofm.onrender.com/api/jobs/', this.newJob).subscribe(() => {
      this.fetchJobs();
      this.newJob = { title: '', description: '' };
    });
  }

}

import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { NgbDatepickerModule, NgbModal, NgbRatingModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-rating-list',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbDatepickerModule,NgbRatingModule],
  templateUrl: './rating-list.component.html',
  styleUrl: './rating-list.component.css',
})
export class RatingListComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private modalService = inject(NgbModal);
  rows: any[] = [];
  ratingQuestions: any[] = [];
  keyword = '';
  loading = false;
  loadingQuestions = false;
  errorMessage = '';
  questionErrorMessage = '';
  detail: any = null;
	rating : any = [0, 0]; // Initialize rating as an array with two elements
  ngOnInit(): void {
    this.loadRatings();
    this.loadRatingQuestions();
  }

  loadRatings(): void {
    this.loading = true;
    this.errorMessage = '';

    const query: Record<string, string> = {};

    if (this.keyword.trim()) {
      query['keyword'] = this.keyword.trim();
    }

    this.apiService.get('/rating', query).subscribe({
      next: (response) => {
        this.loading = false;
        this.rows = Array.isArray(response?.data) ? response.data : [];
      },
      error: (error) => {
        this.loading = false;
        this.rows = [];
        this.errorMessage =
          error?.error?.message || 'Failed to load rating data.';
      },
    });
  }

  resetFilter(): void {
    this.keyword = '';
    this.loadRatings();
  }

  loadRatingQuestions(): void {
    this.loadingQuestions = true;
    this.questionErrorMessage = '';

    this.apiService.get('/rating/master', { status: 1 }).subscribe({
      next: (response) => {
        this.loadingQuestions = false;
        this.ratingQuestions = Array.isArray(response?.data) ? response.data : [];

        for (const question of this.ratingQuestions) {
          question.value = 3;
        }
      },
      error: (error) => {
        this.loadingQuestions = false;
        this.ratingQuestions = [];
        this.questionErrorMessage =
          error?.error?.message || 'Failed to load rating question master.';
      },
    });
  }

  trackById(_: number, row: any): any {
    return row?.id;
  }

  open(content: any, row: any): void {
    this.detail = row;
       for (const question of this.ratingQuestions) {
          question.value = 3;
        }

    if (!this.ratingQuestions.length && !this.loadingQuestions) {
      this.loadRatingQuestions();
    }

    this.modalService.open(content, { size: 'lg' });
  }

  onSubmitRate(): void {
    const payload = this.ratingQuestions.map((question) => ({
      questionId: question.id,
      rating: question.value || 0,
    }));
    console.log(payload ,this.detail.id);
    this.modalService.dismissAll();
  }
}

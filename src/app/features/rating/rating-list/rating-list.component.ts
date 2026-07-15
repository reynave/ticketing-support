import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { NgbDatepickerModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-rating-list',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbDatepickerModule],
  templateUrl: './rating-list.component.html',
  styleUrl: './rating-list.component.css',
})
export class RatingListComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private modalService = inject(NgbModal);
  rows: any[] = [];
  keyword = '';
  loading = false;
  errorMessage = '';

  ngOnInit(): void {
    this.loadRatings();
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

  trackById(_: number, row: any): any {
    return row?.id;
  }

  open(content: any) {
    this.modalService.open(content, { size: 'lg' });
  }
}

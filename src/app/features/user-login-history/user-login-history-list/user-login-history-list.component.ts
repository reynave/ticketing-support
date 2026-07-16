import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-user-login-history-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [DatePipe],
  templateUrl: './user-login-history-list.component.html',
  styleUrl: './user-login-history-list.component.css',
})
export class UserLoginHistoryListComponent implements OnInit {
  private readonly apiService = inject(ApiService);

  rows: any[] = [];
  loading = false;
  errorMessage = '';
  keyword = '';
  selectedUserId = '';

  ngOnInit(): void {
    this.loadHistory();
  }

  loadHistory(): void {
    this.loading = true;
    this.errorMessage = '';

   

    this.apiService.get('/user-login-history').subscribe({
      next: (response) => {
        this.loading = false;
        this.rows = Array.isArray(response?.data) ? response.data : [];
      },
      error: (error) => {
        this.loading = false;
        this.rows = [];
        this.errorMessage = error?.error?.message || 'Failed to load login history.';
      },
    });
  }

  resetFilter(): void {
    this.keyword = '';
    this.selectedUserId = '';
    this.loadHistory();
  }

  trackById(_: number, row: any): any {
    return row?.id;
  }
}

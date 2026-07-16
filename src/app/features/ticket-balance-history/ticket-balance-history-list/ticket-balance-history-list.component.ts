import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-ticket-balance-history-list',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  providers: [DatePipe],
  templateUrl: './ticket-balance-history-list.component.html',
  styleUrl: './ticket-balance-history-list.component.css',
})
export class TicketBalanceHistoryListComponent implements OnInit {
  private readonly apiService = inject(ApiService);

  rows: any[] = [];
  loading = false;
  errorMessage = '';

  ngOnInit(): void {
    this.loadHistory();
  }

  loadHistory(): void {
    this.loading = true;
    this.errorMessage = '';

    this.apiService.get('/ticket-balance/history').subscribe({
      next: (response) => {
        this.loading = false;
        this.rows = Array.isArray(response?.data) ? response.data : [];
      },
      error: (error) => {
        this.loading = false;
        this.rows = [];
        this.errorMessage = error?.error?.message || 'Failed to load ticket balance history.';
      },
    });
  }

  trackById(_: number, row: any): any {
    return row?.id;
  }
}

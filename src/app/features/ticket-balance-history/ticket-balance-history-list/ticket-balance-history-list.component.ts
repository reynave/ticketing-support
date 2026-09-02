import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
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
  private readonly authService = inject(AuthService);

  readonly moduleId = 6001;

  get canAccessPage(): boolean {
    return this.authService.hasPermission(this.moduleId, 'r');
  }

  rows: any[] = [];
  loading = false;
  errorMessage = '';

  ngOnInit(): void {
    if (!this.canAccessPage) {
      return;
    }

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

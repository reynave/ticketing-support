import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-attendance-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './attendance-list.component.html',
  styleUrl: './attendance-list.component.css',
})
export class AttendanceListComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly authService = inject(AuthService);

  readonly moduleId = 7001;

  get canAccessPage(): boolean {
    return this.authService.hasPermission(this.moduleId, 'r');
  }

  rows: any[] = [];
  loading = false;
  errorMessage = '';

  filter = {
    userId: '',
    workDateFrom: '',
    workDateTo: '',
    keyword: '',
  };

  ngOnInit(): void {
    if (!this.canAccessPage) {
      return;
    }

    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorMessage = '';

    this.apiService
      .get('/attendance', {
        userId: this.filter.userId,
        workDateFrom: this.filter.workDateFrom,
        workDateTo: this.filter.workDateTo,
        keyword: this.filter.keyword,
      })
      .subscribe({
        next: (response) => {
          this.loading = false;
          this.rows = Array.isArray(response?.data) ? response.data : [];
        },
        error: (error) => {
          this.loading = false;
          this.rows = [];
          this.errorMessage =
            error?.error?.message || 'Failed to load attendance data.';
        },
      });
  }

  resetFilter(): void {
    this.filter = {
      userId: '',
      workDateFrom: '',
      workDateTo: '',
      keyword: '',
    };
    this.load();
  }

  trackById(_: number, row: any): any {
    return row?.id;
  }
}
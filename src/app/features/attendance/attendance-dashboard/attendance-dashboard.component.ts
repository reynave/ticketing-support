import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-attendance-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './attendance-dashboard.component.html',
  styleUrl: './attendance-dashboard.component.css',
})
export class AttendanceDashboardComponent implements OnInit { 
   private readonly apiService = inject(ApiService);
  private readonly authService = inject(AuthService);

  readonly moduleId = 7001;

  get canAccessPage(): boolean {
    return this.authService.hasPermission(this.moduleId, 'r');
  }

  loading = false;
  errorMessage = '';

  summary: any = {
    kpi: {},
    trend: [],
    locations: [],
    needsAttention: [],
    today: [],
  };

  filter = {
    period: 'Today',
    location: '',
    status: '',
    employee: '',
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

    this.apiService.get('/attendance/summary').subscribe({
      next: (response) => {
        this.loading = false;
        this.summary = response?.data || this.summary;
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage =
          error?.error?.message || 'Failed to load attendance summary.';
      },
    });
  }

  resetFilter(): void {
    this.filter = { period: 'Today', location: '', status: '', employee: '' };
    this.load();
  }

  get filteredToday(): any[] {
    const keyword = this.filter.employee.trim().toLowerCase();
    const location = this.filter.location;
    const status = this.filter.status;

    return (this.summary.today || []).filter((row: any) => {
      if (
        keyword &&
        !(
          String(row.name || '').toLowerCase().includes(keyword) ||
          String(row.userId || '').toLowerCase().includes(keyword)
        )
      ) {
        return false;
      }

      if (location && row.location !== location) {
        return false;
      }

      if (status) {
        if (status === 'Checked out') {
          if (!String(row.status || '').startsWith('Checked out')) {
            return false;
          }
        } else if (row.status !== status) {
          return false;
        }
      }

      return true;
    });
  }

  checkedInPct(): number {
    const total = Number(this.summary.kpi?.totalEmployees) || 0;
    const checked = Number(this.summary.kpi?.checkedInToday) || 0;
    return total ? Math.round((checked / total) * 100) : 0;
  }

  locPct(count: number): number {
    const total = Number(this.summary.kpi?.checkedInToday) || 1;
    return Math.round((Number(count) / total) * 100);
  }

  barUnit(): number {
    const total = Number(this.summary.kpi?.totalEmployees) || 1;
    return 180 / total;
  }

  barHeight(count: number): number {
    const height = Math.round((Number(count) || 0) * this.barUnit());
    return count > 0 ? Math.max(height, 6) : 0;
  }

  initialsOf(name: string): string {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) {
      return '?';
    }
    if (parts.length === 1) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  avatarClass(status: string): string {
    if (status === 'Working') return 'bg-success-subtle text-success-emphasis';
    if (status === 'Late') return 'bg-warning-subtle text-warning-emphasis';
    if (status === 'Not checked in') return 'bg-danger-subtle text-danger-emphasis';
    return 'bg-secondary-subtle text-secondary-emphasis';
  }

  statusBadgeClass(status: string): string {
    if (status === 'Working') return 'bg-success-subtle text-success-emphasis';
    if (status === 'Late') return 'bg-warning-subtle text-warning-emphasis';
    if (status === 'Not checked in') return 'bg-danger-subtle text-danger-emphasis';
    return 'bg-secondary-subtle text-secondary-emphasis';
  }

  attentionClass(severity: string): string {
    const classes: Record<string, string> = {
      danger: 'border-danger bg-danger-subtle bg-opacity-25',
      warning: 'border-warning bg-warning-subtle bg-opacity-25',
      secondary: 'border-secondary bg-secondary-subtle bg-opacity-25',
    };
    return classes[severity] || classes['secondary'];
  }
}
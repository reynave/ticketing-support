import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-attendance-summary',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './attendance-summary.component.html',
  styleUrl: './attendance-summary.component.css',
})
export class AttendanceSummaryComponent implements OnInit {
   private readonly apiService = inject(ApiService);
  private readonly authService = inject(AuthService);

  readonly moduleId = 7001;

  get canAccessPage(): boolean {
    return this.authService.hasPermission(this.moduleId, 'r');
  }

  loading = false;
  errorMessage = '';
  month = '';

  dashboard: any = {
    workingDays: 0,
    periodLabel: '',
    monthOptions: [],
    employees: [],
    totals: {
      present: 0,
      late: 0,
      absent: 0,
      missingOut: 0,
      totalHours: '0h 0m',
      avgPerDay: '0h 0m',
      rate: 0,
    },
  };

  filter = {
    period: 'This month',
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

    this.apiService
      .get('/attendance/dashboard', { month: this.month || undefined })
      .subscribe({
        next: (response) => {
          this.loading = false;
          this.dashboard = response?.data || this.dashboard;
          this.month = this.dashboard.month || this.month;
        },
        error: (error) => {
          this.loading = false;
          this.errorMessage =
            error?.error?.message || 'Failed to load attendance dashboard.';
        },
      });
  }

  get filteredEmployees(): any[] {
    const keyword = this.filter.employee.trim().toLowerCase();
    if (!keyword) {
      return this.dashboard.employees || [];
    }
    return (this.dashboard.employees || []).filter(
      (e: any) =>
        String(e.name || '').toLowerCase().includes(keyword) ||
        String(e.userId || '').toLowerCase().includes(keyword),
    );
  }

  resetFilter(): void {
    this.filter = {
      period: 'This month',
      location: '',
      status: '',
      employee: '',
    };
    this.load();
  }

  rateClass(rate: number): string {
    if (rate >= 90) return 'bg-success';
    if (rate >= 80) return 'bg-warning';
    return 'bg-danger';
  }

  printDashboard(): void {
    window.print();
  }

  exportCsv(): void {
    const rows = this.filteredEmployees;
    const q = (v: any) => '"' + String(v).replace(/"/g, '""') + '"';
    const head = [
      'Employee',
      'User ID',
      'Present',
      'Late',
      'Absent',
      'Missing out',
      'Total hours',
      'Avg/day',
      'Attendance rate',
    ];
    const lines = [head.join(',')].concat(
      rows.map((e: any) =>
        [
          e.name,
          e.userId,
          e.present,
          e.late,
          e.absent,
          e.missingOut,
          e.totalHours,
          e.avgPerDay,
          e.rate + '%',
        ]
          .map(q)
          .join(','),
      ),
    );

    const t = this.dashboard.totals;
    if (t) {
      lines.push(
        [
          'Team total',
          '',
          t.present,
          t.late,
          t.absent,
          t.missingOut,
          t.totalHours,
          t.avgPerDay,
          t.rate + '%',
        ]
          .map(q)
          .join(','),
      );
    }

    const a = document.createElement('a');
    a.href = URL.createObjectURL(
      new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' }),
    );
    a.download = `attendance-dashboard-${this.month || 'all'}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}
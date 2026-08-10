import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-master-template',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './master-template.component.html',
  styleUrl: './master-template.component.css',
})
export class MasterTemplateComponent {
  private readonly apiService = inject(ApiService);
  private readonly router = inject(Router);

  rows: any[] = [];
  loading = false;
  errorMessage = '';

  constructor() {
    this.loadRows();
  }

  loadRows(): void {
    this.loading = true;
    this.errorMessage = '';

    this.apiService.get('/template', { status: 1 }).subscribe({
      next: (response) => {
        this.loading = false;
        this.rows = Array.isArray(response?.data) ? response.data : [];
      },
      error: (error) => {
        this.loading = false;
        this.rows = [];
        this.errorMessage = error?.error?.message || 'Failed to load template master data.';
      },
    });
  }

  goToDetail(row: any): void {
    const id = Number(row?.id || 0);

    if (!id) {
      return;
    }

    void this.router.navigate(['/master-template', id]);
  }

  trackById(_: number, row: any): any {
    return row?.id;
  }
}

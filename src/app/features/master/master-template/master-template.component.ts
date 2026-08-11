import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
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
  deleting = false;

  constructor() {
    this.loadRows();
  }

  loadRows(): void {
    this.loading = true;
    this.errorMessage = '';

    this.apiService.get('/template', { status: 1 }).subscribe({
      next: (response) => {
        this.loading = false;
        this.rows = (Array.isArray(response?.data) ? response.data : []).map(
          (row: any) => ({ ...row, checked: false }),
        );
        this.updateDeleteState();
      },
      error: (error) => {
        this.loading = false;
        this.rows = [];
        this.updateDeleteState();
        this.errorMessage =
          error?.error?.message || 'Failed to load template master data.';
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

  disabledDelete = true;

  toggleRowChecked(row: any): void {
    row.checked = !row.checked;
    this.updateDeleteState();
  }

  async deleteSelected(): Promise<void> {
    if (this.deleting) {
      return;
    }

    const selectedRows = this.rows.filter((row) => Boolean(row?.checked));

    if (!selectedRows.length) {
      this.updateDeleteState();
      return;
    }

    const ids = selectedRows
      .map((row) => Number(row?.id || 0))
      .filter((id) => id > 0);

    if (!ids.length) {
      this.errorMessage = 'Selected rows contain invalid template id.';
      this.updateDeleteState();
      return;
    }

    const confirmed = confirm(`Delete ${ids.length} selected template(s)?`);

    if (!confirmed) {
      return;
    }

    this.deleting = true;
    this.errorMessage = '';

    try {
      const results = await Promise.allSettled(
        ids.map((id) => firstValueFrom(this.apiService.delete(`/template/${id}`))),
      );

      const failedCount = results.filter(
        (result) => result.status === 'rejected',
      ).length;

      if (failedCount > 0) {
        this.errorMessage = `${failedCount} template(s) failed to delete.`;
      }

      this.loadRows();
    } catch {
      this.errorMessage = 'Failed to delete selected template(s).';
    } finally {
      this.deleting = false;
    }
  }

  private updateDeleteState(): void {
    this.disabledDelete =
      this.deleting || !this.rows.some((row) => Boolean(row?.checked));
  }
}

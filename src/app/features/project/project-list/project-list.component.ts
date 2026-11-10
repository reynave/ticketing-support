import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './project-list.component.html',
  styleUrl: './project-list.component.css',
})
export class ProjectListComponent {
  private readonly apiService = inject(ApiService);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  readonly moduleId = 2001;

  get canAccessPage(): boolean {
    return this.authService.hasPermission(this.moduleId, 'r');
  }

  get canCreate(): boolean {
    return this.authService.hasPermission(this.moduleId, 'c');
  }

  get canDelete(): boolean {
    return this.authService.hasPermission(this.moduleId, 'd');
  }

  rows: any[] = [];
  drafts: any[] = [];
  clients: any[] = [];
  projectTypes: any[] = [];
  projectBilleables: any[] = [];
  products: any[] = [];
  ticketCategories: any[] = [];
  loading = false;
  loadingDrafts = false;
  loadingOptions = false;
  deletingId: string | null = null;

  message = '';
  errorMessage = '';

  keyword = '';
  selectedStatus = '1';
  selectedClientId = '';
  selectedProjectTypeId = '';

  constructor() {
    if (!this.canAccessPage) {
      return;
    }

    this.loadProjects();
    this.loadDrafts();
    void this.loadOptions();
  }

  loadProjects(): void {
    this.loading = true;
    this.errorMessage = '';

    const query: Record<string, string | number> = {};
    query['matchUserProduct'] = 1;

    if (this.keyword.trim()) {
      query['keyword'] = this.keyword.trim();
    }

    if (this.selectedStatus !== '') {
      query['status'] = Number(this.selectedStatus);
    }

    if (this.selectedClientId !== '') {
      query['clientId'] = this.selectedClientId;
    }

    if (this.selectedProjectTypeId !== '') {
      query['projectTypeId'] = Number(this.selectedProjectTypeId);
    }

    this.apiService.get('/project', query).subscribe({
      next: (response) => {
        this.loading = false;
        this.rows = Array.isArray(response?.data) ? response.data : [];
      },
      error: (error) => {
        this.loading = false;
        this.rows = [];
        this.errorMessage = error?.error?.message || 'Failed to load project master data.';
      },
    });
  }

  loadDrafts(): void {
    this.loadingDrafts = true;

    this.apiService.get('/project/drafts').subscribe({
      next: (response) => {
        this.loadingDrafts = false;
        this.drafts = Array.isArray(response?.data) ? response.data : [];
      },
      error: () => {
        this.loadingDrafts = false;
        this.drafts = [];
      },
    });
  }

  resetFilter(): void {
    this.keyword = '';
    this.selectedStatus = '';
    this.selectedClientId = '';
    this.selectedProjectTypeId = '';
    this.loadProjects();
  }

  async loadOptions(): Promise<void> {
    this.loadingOptions = true;

    try {
      const [clientResponse, projectTypeResponse, projectBilleableResponse, productResponse, ticketCategoriesResponse] = await Promise.all([
        firstValueFrom(this.apiService.get('/client', { matchUserProduct: 1 })),
        firstValueFrom(this.apiService.get('/master/project-type', { status: 1 })),
        firstValueFrom(this.apiService.get('/master/project-billeable', { status: 1 })),
        firstValueFrom(this.apiService.get('/product-master', { status: 1, parentId: 0 })),
        firstValueFrom(this.apiService.get('/ticket-categories', { status: 1, parentId: 0 })),
      ]);

      this.clients = Array.isArray(clientResponse?.data) ? clientResponse.data : [];
      this.projectTypes = Array.isArray(projectTypeResponse?.data) ? projectTypeResponse.data : [];
      this.projectBilleables = Array.isArray(projectBilleableResponse?.data) ? projectBilleableResponse.data : [];
      this.products = Array.isArray(productResponse?.data) ? productResponse.data : [];
      this.ticketCategories = Array.isArray(ticketCategoriesResponse?.data) ? ticketCategoriesResponse.data : [];

    } catch {
      this.clients = [];
      this.projectTypes = [];
      this.projectBilleables = [];
      this.products = [];
      this.ticketCategories = [];
    } finally {
      this.loadingOptions = false;
    }
  }
 
  async openCreateModal(): Promise<void> {
    if (!this.canCreate) {
      return;
    }

    this.errorMessage = '';
    this.message = '';

    try {
      const response = await firstValueFrom(this.apiService.post('/project/draft', {}));
      const id = String(response?.data?.id ?? response?.data ?? '').trim();

      if (!id) {
        this.errorMessage = 'Failed to create project draft.';
        return;
      }

      await this.router.navigate(['/project/create', id]);
    } catch (error: any) {
      this.errorMessage = error?.error?.message || 'Failed to create project draft.';
    }
  }

  openDraft(row: any): void {
    const id = String(row?.id || '').trim();

    if (!id) {
      return;
    }

    void this.router.navigate(['/project/create', id]);
  }

  deleteDraft(row: any): void {
    if (!this.canDelete) {
      return;
    }

    const id = String(row?.id || '').trim();

    if (!id) {
      return;
    }

    const confirmed = confirm(`Delete draft ${id}?`);

    if (!confirmed) {
      return;
    }

    this.deletingId = id;
    this.errorMessage = '';

    this.apiService.delete(`/project/${id}`).subscribe({
      next: (response) => {
        this.deletingId = null;
        this.message = response?.message || 'Project draft deleted.';
        this.loadDrafts();
      },
      error: (error) => {
        this.deletingId = null;
        this.errorMessage = error?.error?.message || 'Failed to delete project draft.';
      },
    });
  }

  goToDetail(row: any): void {
    const id = String(row?.id || '').trim();

    if (!id) {
      return;
    }

    void this.router.navigate(['/project', id]);
  }

  deleteProject(row: any): void {
    if (!this.canDelete) {
      return;
    }

    const id = String(row?.id || '').trim();

    if (!id) {
      return;
    }

    const confirmed = confirm(`Delete project ${id}?`);

    if (!confirmed) {
      return;
    }

    this.deletingId = id;
    this.errorMessage = '';

    this.apiService.delete(`/project/${id}`).subscribe({
      next: (response) => {
        this.deletingId = null;
        this.message = response?.message || 'Project master deleted.';
        this.loadProjects();
      },
      error: (error) => {
        this.deletingId = null;
        this.errorMessage = error?.error?.message || 'Failed to delete project master data.';
      },
    });
  }

  trackById(_: number, row: any): any {
    return row?.id;
  }
}
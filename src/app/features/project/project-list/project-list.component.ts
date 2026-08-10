import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';

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

  rows: any[] = [];
  clients: any[] = [];
  projectTypes: any[] = [];
  projectBilleables: any[] = [];
  products: any[] = [];
  ticketCategories: any[] = [];
  loading = false;
  loadingOptions = false;
  deletingId: string | null = null;

  message = '';
  errorMessage = '';

  keyword = '';
  selectedStatus = '1';
  selectedClientId = '';
  selectedProjectTypeId = '';

  constructor() {
    this.loadProjects();
    void this.loadOptions();
  }

  loadProjects(): void {
    this.loading = true;
    this.errorMessage = '';

    const query: Record<string, string | number> = {};

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
        firstValueFrom(this.apiService.get('/client')),
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
 
  openCreateModal(): void {
    this.errorMessage = '';
    this.message = '';
    void this.router.navigate(['/project/create']);
  }

  goToDetail(row: any): void {
    const id = String(row?.id || '').trim();

    if (!id) {
      return;
    }

    void this.router.navigate(['/project', id]);
  }

  deleteProject(row: any): void {
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
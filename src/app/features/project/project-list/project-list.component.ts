import { CommonModule } from '@angular/common';
import { Component, TemplateRef, ViewChild, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgbModal, NgbModalModule, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';

interface ProjectFormModel {
  id: string;
  projectTypeId: number;
  projectBilleableId: number;
  projectCategoryId: number;
  productId: number;
  clientId: string;
  startDate: string;
  endDate: string;
  status: number;
  templateMaster: string;
}

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgbModalModule],
  templateUrl: './project-list.component.html',
  styleUrl: './project-list.component.css',
})
export class ProjectListComponent {
  private readonly apiService = inject(ApiService);
  private readonly router = inject(Router);
  private readonly modalService = inject(NgbModal);

  @ViewChild('createProjectModal') createProjectModal?: TemplateRef<unknown>;

  private modalRef: NgbModalRef | null = null;

  rows: any[] = [];
  clients: any[] = [];
  projectTypes: any[] = [];
  projectBilleables: any[] = [];
  projectCategories: any[] = [];
  products: any[] = [];

  loading = false;
  loadingOptions = false;
  saving = false;
  deletingId: string | null = null;

  message = '';
  errorMessage = '';

  keyword = '';
  selectedStatus = '';
  selectedClientId = '';
  selectedProjectTypeId = '';

  formModel: ProjectFormModel = this.defaultForm();

  constructor() {
    this.loadProjects();
    this.loadOptions();
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
        this.errorMessage = error?.error?.message || 'Failed to load projects.';
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
      const [clientResponse, projectTypeResponse, projectBilleableResponse, projectCategoryResponse, productResponse] = await Promise.all([
        firstValueFrom(this.apiService.get('/client')),
        firstValueFrom(this.apiService.get('/master/project-type', { status: 1 })),
        firstValueFrom(this.apiService.get('/master/project-billeable', { status: 1 })),
        firstValueFrom(this.apiService.get('/master/project-categories', { status: 1 })),
        firstValueFrom(this.apiService.get('/master/product', { status: 1 })),
      ]);

      this.clients = Array.isArray(clientResponse?.data) ? clientResponse.data : [];
      this.projectTypes = Array.isArray(projectTypeResponse?.data) ? projectTypeResponse.data : [];
      this.projectBilleables = Array.isArray(projectBilleableResponse?.data) ? projectBilleableResponse.data : [];
      this.projectCategories = Array.isArray(projectCategoryResponse?.data) ? projectCategoryResponse.data : [];
      this.products = Array.isArray(productResponse?.data) ? productResponse.data : [];
    } catch {
      this.clients = [];
      this.projectTypes = [];
      this.projectBilleables = [];
      this.projectCategories = [];
      this.products = [];
    } finally {
      this.loadingOptions = false;
    }
  }

  openCreateModal(): void {
    if (!this.createProjectModal) {
      return;
    }

    this.formModel = this.defaultForm();
    this.errorMessage = '';
    this.message = '';

    this.modalRef = this.modalService.open(this.createProjectModal, {
      size: 'lg',
      centered: true,
      backdrop: 'static',
    });
  }

  closeModal(): void {
    this.modalRef?.close();
    this.modalRef = null;
  }

  saveProject(form: NgForm): void {
    if (form.invalid || this.saving) {
      return;
    }

    const payload: Record<string, string | number> = {
      projectTypeId: Number(this.formModel.projectTypeId),
      projectBilleableId: Number(this.formModel.projectBilleableId),
      projectCategoryId: Number(this.formModel.projectCategoryId),
      productId: Number(this.formModel.productId),
      clientId: String(this.formModel.clientId),
      startDate: this.formModel.startDate,
      endDate: this.formModel.endDate,
      status: Number(this.formModel.status),
      templateMaster: this.formModel.templateMaster.trim() || '0',
    };

    if (this.formModel.id.trim()) {
      payload['id'] = this.formModel.id.trim();
    }

    this.saving = true;
    this.errorMessage = '';
    this.message = '';

    this.apiService.post('/project', payload).subscribe({
      next: (response) => {
        this.saving = false;
        this.closeModal();

        const id = String(response?.data?.id || '').trim();

        if (id) {
          void this.router.navigate(['/projects', id]);
          return;
        }

        this.message = response?.message || 'Project created.';
        this.loadProjects();
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage = error?.error?.message || 'Failed to create project.';
      },
    });
  }

  goToDetail(row: any): void {
    const id = String(row?.id || '').trim();

    if (!id) {
      return;
    }

    void this.router.navigate(['/projects', id]);
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
        this.message = response?.message || 'Project deleted.';
        this.loadProjects();
      },
      error: (error) => {
        this.deletingId = null;
        this.errorMessage = error?.error?.message || 'Failed to delete project.';
      },
    });
  }

  trackById(_: number, row: any): any {
    return row?.id;
  }

  private defaultForm(): ProjectFormModel {
    return {
      id: '',
      projectTypeId: 0,
      projectBilleableId: 0,
      projectCategoryId: 0,
      productId: 0,
      clientId: '',
      startDate: '',
      endDate: '',
      status: 1,
      templateMaster: '',
    };
  }
}

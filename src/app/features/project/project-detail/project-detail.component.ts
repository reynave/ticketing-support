import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';

interface ProjectFormModel {
  name: string;
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
  selector: 'app-project-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './project-detail.component.html',
  styleUrl: './project-detail.component.css',
})
export class ProjectDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly apiService = inject(ApiService);

  projectId = '';
  project: any = null;

  clients: any[] = [];
  projectTypes: any[] = [];
  projectBilleables: any[] = [];
  projectCategories: any[] = [];
  products: any[] = [];

  loading = false;
  loadingOptions = false;
  saving = false;
  deleting = false;

  formMode: 'view' | 'edit' = 'view';
  message = '';
  errorMessage = '';

  formModel: ProjectFormModel = this.defaultForm();

  ngOnInit(): void {
    this.projectId = String(this.route.snapshot.paramMap.get('id') || '').trim();

    if (!this.projectId) {
      void this.router.navigate(['/projects']);
      return;
    }

    this.loadOptions();
    this.loadProjectDetail();
  }

  goBack(): void {
    history.back();
  }

  loadProjectDetail(): void {
    this.loading = true;
    this.errorMessage = '';

    this.apiService.get(`/project/${this.projectId}`).subscribe({
      next: (response) => {
        this.loading = false;
        this.project = response?.data || null;
        this.populateFormFromProject();
      },
      error: (error) => {
        this.loading = false;
        this.project = null;
        this.errorMessage = error?.error?.message || 'Failed to load project detail.';
      },
    });
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

  startEdit(): void {
    if (!this.project) {
      return;
    }

    this.formMode = 'edit';
    this.populateFormFromProject();
    this.message = '';
    this.errorMessage = '';
  }

  cancelEdit(): void {
    this.formMode = 'view';
    this.populateFormFromProject();
    this.errorMessage = '';
  }

  saveProject(form: NgForm): void {
    if (form.invalid || this.saving) {
      return;
    }

    const payload = {
      name: this.project.name.trim(),
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
    console.log('Payload for saving project:', payload);

    this.saving = true;
    this.message = '';
    this.errorMessage = '';

    this.apiService.put(`/project/${this.projectId}`, payload).subscribe({
      next: (response) => {
        this.saving = false;
        this.message = response?.message || 'Project updated.';
        this.formMode = 'view';
        this.loadProjectDetail();
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage = error?.error?.message || 'Failed to update project.';
      },
    });
  }

  deleteProject(): void {
    if (this.deleting || !this.projectId) {
      return;
    }

    const confirmed = confirm(`Delete project ${this.projectId}?`);

    if (!confirmed) {
      return;
    }

    this.deleting = true;
    this.errorMessage = '';

    this.apiService.delete(`/project/${this.projectId}`).subscribe({
      next: () => {
        this.deleting = false;
        void this.router.navigate(['/projects']);
      },
      error: (error) => {
        this.deleting = false;
        this.errorMessage = error?.error?.message || 'Failed to delete project.';
      },
    });
  }

  private defaultForm(): ProjectFormModel {
    const today = new Date();
    const plusThirtyDays = new Date();
    plusThirtyDays.setDate(plusThirtyDays.getDate() + 30);

    return {
      projectTypeId: 0,
      projectBilleableId: 0,
      projectCategoryId: 0,
      productId: 0,
      clientId: '',
      startDate: this.toDateInputValue(today),
      endDate: this.toDateInputValue(plusThirtyDays),
      status: 1,
      templateMaster: '',
      name: '',
    };
  }

  private populateFormFromProject(): void {
    this.formModel = {
      name: String(this.project?.name ?? ''),
      projectTypeId: Number(this.project?.projectTypeId ?? 0),
      projectBilleableId: Number(this.project?.projectBilleableId ?? 0),
      projectCategoryId: Number(this.project?.projectCategoryId ?? 0),
      productId: Number(this.project?.productId ?? 0),
      clientId: String(this.project?.clientId ?? ''),
      startDate: this.toIsoDate(this.project?.startDate),
      endDate: this.toIsoDate(this.project?.endDate),
      status: Number(this.project?.status ?? 1),
      templateMaster: String(this.project?.templateMaster ?? ''),
    };
  }

  private toIsoDate(value: unknown): string {
    if (!value) {
      return '';
    }

    const raw = String(value);

    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      return raw;
    }

    const date = new Date(raw);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toISOString().slice(0, 10);
  }

  private toDateInputValue(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

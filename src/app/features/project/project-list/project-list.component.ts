import { CommonModule } from '@angular/common';
import { Component, TemplateRef, ViewChild, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgbDatepickerModule, NgbModal, NgbModalModule, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';

interface ProjectFormModel {
  id: string;
  name: string;
  projectTypeId: number;
  projectBilleableId: number;
  productId: number;
  clientId: string;
  startDate: { year: number; month: number; day: number };
  endDate: { year: number; month: number; day: number };
  status: number;
  templateMaster: string;
  userManager : string;
  ticketCategoriesParentId : number;
}

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgbModalModule, NgbDatepickerModule],
   templateUrl: './project-list.component.html',
  styleUrl: './project-list.component.css',
})
export class ProjectListComponent {
  private readonly apiService = inject(ApiService);
  private readonly router = inject(Router);
  private readonly modalService = inject(NgbModal);

  @ViewChild('projectFormModal') projectFormModal?: TemplateRef<unknown>;

  private modalRef: NgbModalRef | null = null;

  rows: any[] = [];
  clients: any[] = [];
  projectTypes: any[] = [];
  projectBilleables: any[] = [];
  products: any[] = [];
  ticketCategories: any[] = [];
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
    users : any = [];
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
      const [clientResponse, projectTypeResponse, projectBilleableResponse, productResponse, userResponse, ticketCategoriesResponse] = await Promise.all([
        firstValueFrom(this.apiService.get('/client')),
        firstValueFrom(this.apiService.get('/master/project-type', { status: 1 })),
        firstValueFrom(this.apiService.get('/master/project-billeable', { status: 1 })),
        firstValueFrom(this.apiService.get('/product-master', { status: 1, parentId: 0 })),
        firstValueFrom(this.apiService.get('/user', { status: 1 })),
        firstValueFrom(this.apiService.get('/ticket-categories', { status: 1 ,parentId :0})),
      ]);
 

      this.clients = Array.isArray(clientResponse?.data) ? clientResponse.data : [];
      this.projectTypes = Array.isArray(projectTypeResponse?.data) ? projectTypeResponse.data : [];
      this.projectBilleables = Array.isArray(projectBilleableResponse?.data) ? projectBilleableResponse.data : [];
      this.products = Array.isArray(productResponse?.data) ? productResponse.data : [];
     const users = Array.isArray(userResponse?.data) ? userResponse.data : [];
      this.ticketCategories = Array.isArray(ticketCategoriesResponse?.data) ? ticketCategoriesResponse.data : [];

      for (const user of users) {
        const arr = {
            id: user.id,
            name : `${user.firstName} ${user.lastName}`,
            userAuthLevel : user.userAuthLevel || '',
            checkbox : false,
            asManager : false,
        }
        this.users.push(arr); 
      }

    } catch {
      this.clients = [];
      this.projectTypes = [];
      this.projectBilleables = [];
      this.products = [];
      this.users = [];
      this.ticketCategories = [];
    } finally {
      this.loadingOptions = false;
    }
  }
 
  toggleManager(index: number): void {
    for (let i = 0; i < this.users.length; i++) { 
        this.users[i].asManager = false;
    }
    this.users[index].asManager = true;
    this.users[index].checked = true;
    
    this.formModel.userManager = this.users[index].name;

  }
  openCreateModal(): void {
    if (!this.projectFormModal) {
      return;
    }

    this.formModel = this.defaultForm();
    this.errorMessage = '';
    this.message = '';

    this.modalRef = this.modalService.open(this.projectFormModal, {
      size: 'lg',
      centered: true,
      backdrop: 'static',
    });
  }

  goToDetail(row: any): void {
    const id = String(row?.id || '').trim();

    if (!id) {
      return;
    }

    void this.router.navigate(['/project', id]);
  }

  closeModal(): void {
    this.modalRef?.close();
    this.modalRef = null;
  }

  saveProject(form: NgForm): void {
    if (form.invalid || this.saving) {
      return;
    }

    const payload: any = {
      name: this.formModel.name.trim(),
      projectTypeId: Number(this.formModel.projectTypeId),
      projectBilleableId: Number(this.formModel.projectBilleableId),
      productId: Number(this.formModel.productId),
      clientId: String(this.formModel.clientId),
      startDate: this.formModel.startDate,
      endDate: this.formModel.endDate,
      status: Number(this.formModel.status),
      templateMaster: this.formModel.templateMaster.trim() || '0',
      projectUsers  : this.users,
      ticketCategoriesParentId : Number(this.formModel.ticketCategoriesParentId),
    };

    if (this.formModel.id.trim()) {
      payload['id'] = this.formModel.id.trim();
    }

    this.saving = true;
    this.errorMessage = '';
    this.message = '';

    const request$ = this.apiService.post('/project', payload);

    request$.subscribe({
      next: (response) => {
        this.saving = false;
        this.closeModal();
        const id = String(response?.data?.id || '').trim();

        if (id) {
          void this.router.navigate(['/project', id]);
          return;
        }

        this.message = response?.message || 'Project master saved.';
        this.loadProjects();
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage = error?.error?.message || 'Failed to save project master data.';
      },
    });
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

  private defaultDateStruct(): { year: number; month: number; day: number } {
    const today = new Date();

    return {
      year: today.getFullYear(),
      month: today.getMonth() + 1,
      day: today.getDate(),
    };
  }

  private defaultForm(): ProjectFormModel {
    const today = this.defaultDateStruct();

    return {
      id: '',
      name: '',
      projectTypeId: 0,
      projectBilleableId: 0,
      productId: 0,
      clientId: '',
      startDate: today,
      endDate: today,
      status: 1,
      templateMaster: '0',
        userManager : '',
        ticketCategoriesParentId : 0,
    };
  }
}

import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router ,  RouterModule } from '@angular/router';
// import { ActivatedRoute, Router , RouterLink } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { NgbDatepickerModule, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';

interface ProjectFormModel {
  name: string;
  projectTypeId: number;
  projectBilleableId: number;
  productId: number;
  clientId: string;
  userManager: any;

  startDate: { year: number; month: number; day: number };
  endDate: { year: number; month: number; day: number };
  status: number;
  templateMaster: string;
  ticketCategoriesParentId : number;
}

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbDatepickerModule, NgbNavModule,RouterModule ],
  templateUrl: './project-detail.component.html',
  styleUrl: './project-detail.component.css',
})
export class ProjectDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly apiService = inject(ApiService);

active = 1;
  projectId = '';
  project: any = null;

  clients: any[] = [];
  projectTypes: any[] = [];
  projectBilleables: any[] = [];
  products: any[] = [];
 ticketCategories: any[] = [];
  loading = false;
  loadingOptions = false;
  saving = false;
  deleting = false;

  formMode: 'view' | 'edit' = 'view';
  message = '';
  errorMessage = '';
  users : any = [];
  projectUsers: any[] = [];
  formModel: ProjectFormModel = this.defaultForm();
  task: any[] = [];
  cases : any[] = [];
  cr: any[] = [];
  contacts : any[] = [];
  ticketBalance : any = null;
 

  ngOnInit(): void {
    this.projectId = String(this.route.snapshot.paramMap.get('id') || '').trim();

    if (!this.projectId) {
      void this.router.navigate(['/master-project']);
      return;
    }

    this.loadOptions();
    this.loadProjectDetail();
  }

  loadProjectDetail(): void {
    this.loading = true;
    this.errorMessage = '';

    this.apiService.get(`/project/${this.projectId}`).subscribe({
      next: (response) => {
        this.loading = false;
        this.project = response?.data || null;
        this.projectUsers = response?.data?.users || [];
        this.contacts = response?.data?.contacts || [];
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
      const [clientResponse, projectTypeResponse, projectBilleableResponse, productResponse, 
        userResponse, taskResponse, caseResponse, crResponse, ticketCategoriesResponse, ticketBalanceResponse
      ] = await Promise.all([
        firstValueFrom(this.apiService.get('/client')),
        firstValueFrom(this.apiService.get('/master/project-type', { status: 1 })),
        firstValueFrom(this.apiService.get('/master/project-billeable', { status: 1 })),
        firstValueFrom(this.apiService.get('/master/product', { status: 1 })),
        firstValueFrom(this.apiService.get('/user', { status: 1 })),
        firstValueFrom(this.apiService.get('/ticket', {  projectId: this.projectId, closed : false })),
        firstValueFrom(this.apiService.get('/cases', {   projectId: this.projectId, closed : false })),
        firstValueFrom(this.apiService.get('/ticket', {   projectId: this.projectId , closed : false})),
        firstValueFrom(this.apiService.get('/ticket-categories',  { status: 1 ,parentId :0})),
         firstValueFrom(this.apiService.get(`/ticket-balance/project/${this.projectId}`)),
        
      ]);

      this.clients = Array.isArray(clientResponse?.data) ? clientResponse.data : [];
      this.projectTypes = Array.isArray(projectTypeResponse?.data) ? projectTypeResponse.data : [];
      this.projectBilleables = Array.isArray(projectBilleableResponse?.data) ? projectBilleableResponse.data : [];
      this.products = Array.isArray(productResponse?.data) ? productResponse.data : [];
       const users = Array.isArray(userResponse?.data) ? userResponse.data : [];
      this.task = Array.isArray(taskResponse?.data) ? taskResponse.data : [];
      this.cases = Array.isArray(caseResponse?.data) ? caseResponse.data : [];
      this.cr = [];
      this.ticketCategories = Array.isArray(ticketCategoriesResponse?.data) ? ticketCategoriesResponse.data : [];
      this.ticketBalance = ticketBalanceResponse?.data || null; 

      for (const user of users) {
        const arr = {
            id: user.id,
            name : `${user.firstName} ${user.lastName}`,
            userAuthLevel : user.userAuthLevel || '',
            checked : false,
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
      name: this.formModel.name.trim(),
      projectTypeId: Number(this.formModel.projectTypeId),
      projectBilleableId: Number(this.formModel.projectBilleableId),
      productId: Number(this.formModel.productId),
      clientId: String(this.formModel.clientId),
      startDate: this.formModel.startDate,
      endDate: this.formModel.endDate,
      status: Number(this.formModel.status),
      templateMaster: this.formModel.templateMaster.trim() || '0',
      ticketCategoriesId : Number(this.formModel.ticketCategoriesParentId),
      users: this.users.filter((user: any) => user.checked).map((user : any) => ({
        id: user.id,
        name: user.name,
        userAuthLevel: user.userAuthLevel,
        asManager: user.asManager
      }))
    };
    console.log('Payload:', payload);

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
        void this.router.navigate(['/master-project']);
      },
      error: (error) => {
        this.deleting = false;
        this.errorMessage = error?.error?.message || 'Failed to delete project.';
      },
    });
  }

  private defaultForm(): ProjectFormModel {
    const today = new Date();

    return {
      name: '',
      projectTypeId: 0,
      projectBilleableId: 0,
      productId: 0,
      clientId: '',
      userManager: '',

      startDate: {
        year: today.getFullYear(),
        month: today.getMonth() + 1,
        day: today.getDate(),
      },
      endDate: {
        year: today.getFullYear(),
        month: today.getMonth() + 1,
        day: today.getDate(),
      },
      status: 1,
      templateMaster: '0',
      ticketCategoriesParentId : 0,
    };
  }

  private populateFormFromProject(): void {
    const startDate = this.project?.startDate ? new Date(this.project.startDate) : new Date();
    const endDate = this.project?.endDate ? new Date(this.project.endDate) : new Date();
    this.mergeProjectUserIntoUsers();
    this.formModel = {
      name: String(this.project?.name ?? ''),
      projectTypeId: Number(this.project?.projectTypeId ?? 0),
      projectBilleableId: Number(this.project?.projectBilleableId ?? 0),
      productId: Number(this.project?.productId ?? 0),
      clientId: String(this.project?.clientId ?? ''),
      userManager: this.projectUsers.filter((pu: any) => pu.asManager).map((pu: any) => pu.userId),
      startDate: {
        year: startDate.getFullYear(),
        month: startDate.getMonth() + 1,
        day: startDate.getDate(),
      },
      endDate: {
        year: endDate.getFullYear(),
        month: endDate.getMonth() + 1,
        day: endDate.getDate(),
      },
      status: Number(this.project?.status ?? 1),
      templateMaster: String(this.project?.templateMaster ?? '0'),
      ticketCategoriesParentId: Number(this.project?.ticketCategoriesParentId ?? 0),
    };
  }

  mergeProjectUserIntoUsers(): void {
    this.projectUsers.forEach(pu => {
      const user = this.users.find((u: any) => u.id === pu.userId);
      if (user) {
        user.checked = true;
        user.asManager = !!pu.asManager;
      }
    });
  }

  back(){
    history.back();
  }
}

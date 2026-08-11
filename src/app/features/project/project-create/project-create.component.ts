import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbDatepickerModule, NgbModal, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
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
  userManager: string;
  ticketCategoriesParentId: number;
}

@Component({
  selector: 'app-project-create',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbDatepickerModule, NgbNavModule],
  styleUrls: ['./project-create.component.css'],
  templateUrl: './project-create.component.html',
})
export class ProjectCreateComponent {
  private readonly apiService = inject(ApiService);
  private readonly router = inject(Router);
  modalService = inject(NgbModal);
  active : number = 1;
  clients: any[] = [];
  projectTypes: any[] = [];
  projectBilleables: any[] = [];
  products: any[] = [];
  ticketCategories: any[] = [];
  allUsers: any[] = [];
  users: any[] = [];

  loadingOptions = false;
  saving = false;
  errorMessage = '';
  userSearchKeyword = '';

  formModel: ProjectFormModel = this.defaultForm();
  loadingTemplateMaster: boolean = false;
  templateName: string = '';
  listOfTemplateMaster: any[] = [];
  constructor() {
    void this.loadOptions();
  }

  async loadOptions(): Promise<void> {
    this.loadingOptions = true;

    try {
      const [
        clientResponse,
        projectTypeResponse,
        projectBilleableResponse,
        productResponse,
        userResponse,
        ticketCategoriesResponse,
        templateMasterResponse,
      ] = await Promise.all([
        firstValueFrom(this.apiService.get('/client')),
        firstValueFrom(
          this.apiService.get('/master/project-type', { status: 1 }),
        ),
        firstValueFrom(
          this.apiService.get('/master/project-billeable', { status: 1 }),
        ),
        firstValueFrom(
          this.apiService.get('/product-master', { status: 1, parentId: 0 }),
        ),
        firstValueFrom(this.apiService.get('/user', { status: 1 })),
        firstValueFrom(
          this.apiService.get('/ticket-categories', { status: 1, parentId: 0 }),
        ),
        firstValueFrom(this.apiService.get('/template')),
      ]);

      this.clients = Array.isArray(clientResponse?.data)
        ? clientResponse.data
        : [];
      this.projectTypes = Array.isArray(projectTypeResponse?.data)
        ? projectTypeResponse.data
        : [];
      this.projectBilleables = Array.isArray(projectBilleableResponse?.data)
        ? projectBilleableResponse.data
        : [];
      this.products = Array.isArray(productResponse?.data)
        ? productResponse.data
        : [];
      this.ticketCategories = Array.isArray(ticketCategoriesResponse?.data)
        ? ticketCategoriesResponse.data
        : [];
      this.listOfTemplateMaster = Array.isArray(templateMasterResponse?.data)
        ? templateMasterResponse.data
        : [];

      const users = Array.isArray(userResponse?.data) ? userResponse.data : [];
      this.allUsers = users.map((user: any) => ({
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        userAuthLevel: user.userAuthLevel || '',
        checked: false,
        asManager: false,
      }));
      this.users = [...this.allUsers];
    } catch {
      this.clients = [];
      this.projectTypes = [];
      this.projectBilleables = [];
      this.products = [];
      this.ticketCategories = [];
      this.allUsers = [];
      this.users = [];
      this.listOfTemplateMaster = [];
    } finally {
      this.loadingOptions = false;
    }
  }

  reload() {
    location.reload();
  }
  toggleManager(index: number): void {
    const selectedUser = this.users[index];

    if (!selectedUser) {
      return;
    }

    this.allUsers.forEach((user: any) => {
      user.asManager = false;
    });

    selectedUser.asManager = true;
    selectedUser.checked = true;
    this.formModel.userManager = selectedUser.name;
  }

  searchUsers(): void {
    const keyword = this.userSearchKeyword.trim().toLowerCase();

    if (!keyword) {
      this.users = [...this.allUsers];
      return;
    }

    this.users = this.allUsers.filter((user: any) => {
      const name = String(user.name || '').toLowerCase();
      const id = String(user.id || '');
      return name.includes(keyword) || id.includes(keyword);
    });
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
      templateMaster: this.formModel.templateMaster.trim(),
      projectUsers: this.allUsers,
      ticketCategoriesParentId: Number(this.formModel.ticketCategoriesParentId),
      template : {
        cases : this.templateDetail.project.cases || [],
        tasks : this.templateDetail.project.tasks || [],
         task : this.templateDetail.project.task || [],
        
        cr  : this.templateDetail.project.cr || [],
        contacts : this.templateDetail.project.contacts || [],
        templateId :this.formModel.templateMaster.trim(),
      }
    };

   this.saving = true;
  this.errorMessage = '';
    console.log('Payload to save project:', payload);
 
    this.apiService.post('/project', payload).subscribe({
      next: (response) => {
        console.log(response);
        this.saving = false;
        const id = String(response?.data?.id || '').trim();

        if (id) {
          this.router.navigate(['/projects']).then(() => {
            void this.router.navigate(['/project', id]);
          });
          return;
        }

        this.errorMessage =
          response?.message || 'Failed to save project master data.';
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage =
          error?.error?.message || 'Failed to save project master data.';
      },
    }); 
  }

  goBack(): void {
    void this.router.navigate(['/projects']);
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
      templateMaster: '',
      userManager: '',
      ticketCategoriesParentId: 0,
    };
  }

  loadTemplateMaster(content: any): void {
    this.modalService.open(content, { size: 'xl' });
    this.loadingTemplateMaster = true;
  }

  templateDetail : any = null;
  selectTemplateMaster(template: any): void {
    if (!template) {
      return;
    }

    this.templateName = template.name;
    this.formModel.templateMaster = String(template.id);

    this.apiService.get(`/template/${template.id}`).subscribe({
      next: (response) => {

        const templateDetail = response?.data ?? response;
        const parsedTemplate = this.parseTemplatePayload(
          templateDetail,
          template,
        );

        this.formModel = {
          ...this.formModel,
          ...parsedTemplate.formModel,
        };


              //  console.log('Template detail response:', response.data.json);
        // convert json to object if it's a string
        this.templateDetail = this.tryParseJson(response.data.json) ?? response.data.json;
        console.log('Parsed template detail:', this.templateDetail);

        this.loadingTemplateMaster = false;
        this.modalService.dismissAll();
      },
      error: (error) => {
        console.error('Error loading template detail:', error);
        this.loadingTemplateMaster = false;
      },
    });
  }

  private parseTemplatePayload(
    templateDetail: any,
    template: any,
  ): {
    formModel: Partial<ProjectFormModel>;
  } {
    const rawJson = templateDetail?.json ?? templateDetail;
    const parsedJson = this.tryParseJson(rawJson);
    const projectData = parsedJson?.project ?? parsedJson;

    const users = Array.isArray(projectData?.users) ? projectData.users : [];
    const managerUser = users.find((user: any) => Boolean(user?.asManager));

    this.allUsers = users.map((user: any) => ({
      id: user.id,
      name: String(user.name || ''),
      userAuthLevel: user.userAuthLevel || '',
      checked: Boolean(user.checked || user.asManager),
      asManager: Boolean(user.asManager),
    }));
    this.users = [...this.allUsers];

    return {
      formModel: {
        id: String(projectData?.id ?? this.formModel.id),
        name: String(projectData?.name ?? this.formModel.name),
        projectTypeId: Number(
          projectData?.projectTypeId ?? this.formModel.projectTypeId,
        ),
        projectBilleableId: Number(
          projectData?.projectBilleableId ?? this.formModel.projectBilleableId,
        ),
        productId: Number(projectData?.productId ?? this.formModel.productId),
        clientId: String(projectData?.clientId ?? this.formModel.clientId),
        startDate:
          this.parseDate(projectData?.startDate) ?? this.formModel.startDate,
        endDate: this.parseDate(projectData?.endDate) ?? this.formModel.endDate,
        status: Number(projectData?.status ?? this.formModel.status),
        templateMaster: String(template?.id ?? this.formModel.templateMaster),
        userManager: String(
          managerUser?.name ??
            projectData?.userManager ??
            this.formModel.userManager,
        ),
        ticketCategoriesParentId: Number(
          projectData?.ticketCategoriesParentId ??
            this.formModel.ticketCategoriesParentId,
        ),
      },
    };
  }

  private tryParseJson(value: any): any {
    if (!value) {
      return null;
    }

    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return null;
      }
    }

    return value;
  }

  private parseDate(
    value: any,
  ): { year: number; month: number; day: number } | null {
    if (!value) {
      return null;
    }

    if (
      typeof value === 'object' &&
      value !== null &&
      'year' in value &&
      'month' in value &&
      'day' in value
    ) {
      return {
        year: Number(value.year),
        month: Number(value.month),
        day: Number(value.day),
      };
    }

    if (typeof value === 'string') {
      const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

      if (match) {
        return {
          year: Number(match[1]),
          month: Number(match[2]),
          day: Number(match[3]),
        };
      }
    }

    return null;
  }
}

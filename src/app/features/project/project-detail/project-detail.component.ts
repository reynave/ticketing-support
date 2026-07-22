import { CommonModule } from '@angular/common';
import { Component, OnInit, TemplateRef, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, Router ,  RouterModule } from '@angular/router';
// import { ActivatedRoute, Router , RouterLink } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { NgbDatepickerModule, NgbModal, NgbModalModule, NgbModalRef, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';

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

interface TaskGroup {
  id: number | string;
  name: string;
  data: any[];
}

interface TicketBalanceFormModel {
  date: string;
  ticketIn: number;
  ticketOut: number;
  note: string;
}

@Component({
  selector: 'app-project-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbDatepickerModule, NgbNavModule, NgbModalModule, RouterModule ],
  templateUrl: './project-detail.component.html',
  styleUrl: './project-detail.component.css',
})
export class ProjectDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly apiService = inject(ApiService);
  private readonly modalService = inject(NgbModal);

  @ViewChild('ticketBalanceModal') ticketBalanceModal?: TemplateRef<unknown>;
  private ticketBalanceModalRef: NgbModalRef | null = null;

active = 1;
  projectId = '';
  project: any = null;
  searchKeyword = '';

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
  savingTicketBalance = false;
  ticketBalanceError = '';
  ticketBalanceForm: TicketBalanceFormModel = this.defaultTicketBalanceForm();
 

  ngOnInit(): void {
    this.projectId = String(this.route.snapshot.paramMap.get('id') || '').trim();

    if (!this.projectId) {
      void this.router.navigate(['/master-project']);
      return;
    }

   
    this.loadProjectDetail();
  }
  ticketChildCategories : any = [];
 
  loadProjectDetail(): void {
    this.loading = true;
    this.errorMessage = '';

    this.apiService.get(`/project/${this.projectId}`).subscribe({
      next: (response) => {
    
        this.project = response?.data || null;
        this.projectUsers = response?.data?.users || [];
        this.contacts = response?.data?.contacts || [];
        this.populateFormFromProject();
        this.ticketChildCategories = response?.data?.ticketCategories || [];

        this.users = response?.data?.users || [];
        console.log('Users:', this.users);
        this.loadOptions();

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
         taskResponse, caseResponse, crResponse, ticketCategoriesResponse, ticketBalanceResponse
      ] = await Promise.all([
        firstValueFrom(this.apiService.get('/client')),
        firstValueFrom(this.apiService.get('/master/project-type', { status: 1 })),
        firstValueFrom(this.apiService.get('/master/project-billeable', { status: 1 })),
        firstValueFrom(this.apiService.get('/product-master', { status: 1, parentId: 0 })), 
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
      const task = Array.isArray(taskResponse?.data) ? taskResponse.data : [];
      const caseRows = Array.isArray(caseResponse?.data) ? caseResponse.data : [];
      const crRowsRaw = Array.isArray(crResponse?.data) ? crResponse.data : [];
      const crRows = crRowsRaw.filter((row: any) => this.isChangeRequestTicket(row));

      const ticketChildCategories = Array.isArray(this.ticketChildCategories) ? this.ticketChildCategories : [];
      this.task = ticketChildCategories.map((item: any) => ({
        ...item,
        data: task.filter((t: any) => t.ticketCategoryId === item.id),
      }));
      console.log(this.task)



      this.cases = ticketChildCategories.map((item: any) => ({
        ...item,
        data: caseRows.filter((t: any) => t.ticketCategoryId === item.id),
      }));
      console.log(this.cases)

      this.cr = ticketChildCategories.map((item: any) => ({
        ...item,
        data: crRows.filter((t: any) => t.ticketCategoryId === item.id),
      }));

      
      this.ticketCategories = Array.isArray(ticketCategoriesResponse?.data) ? ticketCategoriesResponse.data : [];
      this.ticketBalance = ticketBalanceResponse?.data || null; 

     
    
    } catch {
      this.clients = [];
      this.projectTypes = [];
      this.projectBilleables = [];
      this.products = [];
      this.users = [];
      this.ticketCategories = [];
      this.task = [];
      this.cases = [];
      this.cr = [];
    } finally {
      this.loadingOptions = false;
          this.loading = false;
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

  openTicketBalanceModal(): void {
    if (!this.ticketBalanceModal) {
      return;
    }

    this.ticketBalanceForm = this.defaultTicketBalanceForm();
    this.ticketBalanceError = '';

    this.ticketBalanceModalRef = this.modalService.open(this.ticketBalanceModal, {
      centered: true,
      backdrop: 'static',
      keyboard: false,
    });
  }

  closeTicketBalanceModal(): void {
    this.ticketBalanceModalRef?.close();
    this.ticketBalanceModalRef = null;
    this.ticketBalanceError = '';
  }

  saveTicketBalance(form: NgForm): void {
    if (form.invalid || this.savingTicketBalance || !this.projectId) {
      return;
    }

    const ticketIn = Number(this.ticketBalanceForm.ticketIn || 0);
    const ticketOut = Number(this.ticketBalanceForm.ticketOut || 0);

    if (ticketIn <= 0 && ticketOut <= 0) {
      this.ticketBalanceError = 'ticketIn or ticketOut must be greater than 0.';
      return;
    }

    this.savingTicketBalance = true;
    this.ticketBalanceError = '';

    const payload = {
      projectId: this.projectId,
      date: this.ticketBalanceForm.date,
      ticketIn,
      ticketOut,
      note: this.ticketBalanceForm.note.trim(),
    };

    this.apiService.post('/ticket-balance', payload).subscribe({
      next: (response) => {
        this.savingTicketBalance = false;
        this.closeTicketBalanceModal();
        this.message = response?.message || 'Ticket balance transaction created.';
        this.refreshTicketBalance();
        this.active = 5; // Switch to the Ticket Balance tab after saving
      },
      error: (error) => {
        this.savingTicketBalance = false;
        this.ticketBalanceError = error?.error?.message || 'Failed to create ticket balance transaction.';
      },
    });
  }

  private refreshTicketBalance(): void {
    if (!this.projectId) {
      return;
    }

    this.apiService.get(`/ticket-balance/project/${this.projectId}`).subscribe({
      next: (response) => {
        this.ticketBalance = response?.data || [];
      },
      error: () => {
        this.ticketBalance = [];
      },
    });
  }

  get currentTicketBalance(): number {
    const rows = Array.isArray(this.ticketBalance) ? this.ticketBalance : [];

    if (!rows.length) {
      return 0;
    }

    return Number(rows[0]?.balance || 0);
  }

  private matchesSearch(row: any): boolean {
    const keyword = this.searchKeyword.trim().toLowerCase();

    if (!keyword) {
      return true;
    }

    const id = String(row?.id ?? '').toLowerCase();
    const title = String(row?.title ?? '').toLowerCase();
    const category = String(row?.ticketCategoryName ?? row?.name ?? '').toLowerCase();

    return id.includes(keyword) || title.includes(keyword) || category.includes(keyword);
  }

  private isChangeRequestTicket(row: any): boolean {
    const ticketTypeName = String(row?.ticketTypeName || '').trim().toLowerCase();
    const ticketTypeCode = String(row?.ticketTypeCode || '').trim().toLowerCase();

    return ticketTypeName.includes('change') || ticketTypeCode === 'cr';
  }

  get groupedFilteredTask(): TaskGroup[] {
    const grouped = Array.isArray(this.task) ? this.task : [];

    // Preferred payload: [{ id, name, data: Task[] }]
    if (grouped.some((row) => Array.isArray(row?.data))) {
      return grouped
        .map((group: any) => {
          const rows = Array.isArray(group?.data) ? group.data : [];
          const filteredRows = rows.filter((row: any) => {
            const enrichedRow = {
              ...row,
              ticketCategoryName: row?.ticketCategoryName || group?.name || '',
            };

            return this.matchesSearch(enrichedRow);
          });

          return {
            id: group?.id,
            name: String(group?.name || group?.id || 'Unknown Category'),
            data: filteredRows,
          };
        })
        .filter((group: TaskGroup) => group.data.length > 0 || !this.searchKeyword.trim());
    }

    // Backward compatibility for older flat task payload.
    const fallbackRows = grouped.filter((row) => this.matchesSearch(row));
    return [
      {
        id: 'ungrouped',
        name: 'Ungrouped',
        data: fallbackRows,
      },
    ];
  }

  get filteredCases(): any[] {
    return this.cases.filter((row) => this.matchesSearch(row));
  }

  get groupedFilteredCases(): TaskGroup[] {
    const grouped = Array.isArray(this.cases) ? this.cases : [];

    if (grouped.some((row) => Array.isArray(row?.data))) {
      return grouped
        .map((group: any) => {
          const rows = Array.isArray(group?.data) ? group.data : [];
          const filteredRows = rows.filter((row: any) => {
            const enrichedRow = {
              ...row,
              ticketCategoryName: row?.ticketCategoryName || group?.name || '',
            };

            return this.matchesSearch(enrichedRow);
          });

          return {
            id: group?.id,
            name: String(group?.name || group?.id || 'Unknown Category'),
            data: filteredRows,
          };
        })
        .filter((group: TaskGroup) => group.data.length > 0 || !this.searchKeyword.trim());
    }

    const fallbackRows = grouped.filter((row) => this.matchesSearch(row));
    return [
      {
        id: 'ungrouped-cases',
        name: 'Ungrouped',
        data: fallbackRows,
      },
    ];
  }

  get groupedFilteredCr(): TaskGroup[] {
    const grouped = Array.isArray(this.cr) ? this.cr : [];

    if (grouped.some((row) => Array.isArray(row?.data))) {
      return grouped
        .map((group: any) => {
          const rows = Array.isArray(group?.data) ? group.data : [];
          const filteredRows = rows.filter((row: any) => {
            const enrichedRow = {
              ...row,
              ticketCategoryName: row?.ticketCategoryName || group?.name || '',
            };

            return this.matchesSearch(enrichedRow);
          });

          return {
            id: group?.id,
            name: String(group?.name || group?.id || 'Unknown Category'),
            data: filteredRows,
          };
        })
        .filter((group: TaskGroup) => group.data.length > 0 || !this.searchKeyword.trim());
    }

    const fallbackRows = grouped.filter((row) => this.matchesSearch(row));
    return [
      {
        id: 'ungrouped-cr',
        name: 'Ungrouped',
        data: fallbackRows,
      },
    ];
  }

  private defaultTicketBalanceForm(): TicketBalanceFormModel {
    const today = new Date();
    const isoDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    return {
      date: isoDate,
      ticketIn: 0,
      ticketOut: 0,
      note: '',
    };
  }
}

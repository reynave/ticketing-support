import { CommonModule } from '@angular/common';
import { Component, OnInit, TemplateRef, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, Router ,  RouterModule } from '@angular/router';
// import { ActivatedRoute, Router , RouterLink } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { NgbDatepickerModule, NgbModal, NgbModalModule, NgbModalRef, NgbNavModule } from '@ng-bootstrap/ng-bootstrap';
import { AddContactModalComponent, AddContactModalResult } from '../../../core/components/add-contact-modal/add-contact-modal.component';
import { AuthService } from '../../../core/services/auth.service';

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

interface TicketBalanceFormModel {
  date: string;
  ticketIn: number;
  ticketOut: number;
  note: string;
}

interface NewTaskFormModel {
  title: string;
  description: string;
  ticketCategoryId: number | null;
  assignTo: string;
  productChildId: string;
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
  private readonly authService = inject(AuthService);

  readonly moduleId = 2001;

  get canAccessPage(): boolean {
    return this.authService.hasPermission(this.moduleId, 'r');
  }

  get canUpdate(): boolean {
    return this.authService.hasPermission(this.moduleId, 'u');
  }

  get canDelete(): boolean {
    return this.authService.hasPermission(this.moduleId, 'd');
  }

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
  allUsers: any[] = [];
  userSearchKeyword = '';
  divisionFilter = '';
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
  newTaskForm: NewTaskFormModel = this.defaultNewTaskForm();
  savingTask = false;
  addTaskGroupId: number | null = null;
  draggedTask: any = null;
  dataTemplate: { name: string; description: string; version: string } = {
    name: '',
    description: '',
    version: '',
  };
  templateSaving = false;
  templateModalRef: NgbModalRef | null = null;
  templateError = '';


  ngOnInit(): void {
    if (!this.canAccessPage) {
      return;
    }

    this.projectId = String(this.route.snapshot.paramMap.get('id') || '').trim();

    if (!this.projectId) {
      void this.router.navigate(['/master-project']);
      return;
    } 
    this.loadProjectDetail();
  }
  ticketChildCategories : any = [];
  manager : boolean = true;
  loadProjectDetail(): void {
    this.loading = true;
    this.errorMessage = '';

    this.apiService.get(`/project/detail/${this.projectId}`).subscribe({
      next: (response) => {
    
        this.project = response?.data || null;
        this.projectUsers = response?.data?.users || [];
        this.contacts = response?.data?.contacts || [];
        this.populateFormFromProject();
        this.ticketChildCategories = response?.data?.ticketCategories || [];

        this.users = Array.isArray(response?.data?.users) ? response.data.users : [];
        this.allUsers = [...this.users];
       
        for (const user of this.users) {
          if (user.asManager === 1) {
            this.manager = true;
            break;
          } else {
            this.manager = false;
          }
        }
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
        firstValueFrom(this.apiService.get('/project/ticketList', {  projectId: this.projectId, ticketTypeId : 1, closed : false })),
        firstValueFrom(this.apiService.get('/project/ticketList', {  projectId: this.projectId, ticketTypeId : 2, closed : false })),
         firstValueFrom(this.apiService.get('/project/ticketList', {  projectId: this.projectId, ticketTypeId : 3, closed : false })),
        firstValueFrom(this.apiService.get('/ticket-categories',  { status: 1 ,parentId :0})),
         firstValueFrom(this.apiService.get(`/ticket-balance/project/${this.projectId}`)),
        
      ]);

      this.clients = Array.isArray(clientResponse?.data) ? clientResponse.data : [];
      this.projectTypes = Array.isArray(projectTypeResponse?.data) ? projectTypeResponse.data : [];
      this.projectBilleables = Array.isArray(projectBilleableResponse?.data) ? projectBilleableResponse.data : [];
      this.products = Array.isArray(productResponse?.data) ? productResponse.data : []; 
      const task = Array.isArray(taskResponse?.data) ? taskResponse.data : [];

      console.log(task);

      const caseRows = Array.isArray(caseResponse?.data) ? caseResponse.data : [];
      const crRowsRaw = Array.isArray(crResponse?.data) ? crResponse.data : [];

      // Backend `ticketList` already returns data grouped by ticketCategoryIdParent.
      this.task = this.mergeGroupedWithCategories(task);
      this.cases = caseRows;
      this.cr = this.filterCrGroups(crRowsRaw);

      
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
    for (let i = 0; i < this.allUsers.length; i++) { 
        this.allUsers[i].asManager = false;
    }
    this.users[index].asManager = true;
    this.users[index].checked = true;
    
    this.formModel.userManager = this.users[index].name;

  }
  get divisionOptions(): string[] {
    const divisions = this.allUsers
      .map((user: any) => String(user.division ?? '').trim())
      .filter((division: string) => division.length > 0);

    return Array.from(new Set(divisions)).sort((a, b) => a.localeCompare(b));
  }

  searchUsers(): void {
    const keyword = this.userSearchKeyword.trim().toLowerCase();
    const division = this.divisionFilter.trim().toLowerCase();

    this.users = this.allUsers.filter((user: any) => {
      const name = String(user.name || '').toLowerCase();
      const id = String(user.id || '');
      const userDivision = String(user.division || '').toLowerCase();

      const matchesKeyword = !keyword || name.includes(keyword) || id.includes(keyword);
      const matchesDivision = !division || userDivision === division;

      return matchesKeyword && matchesDivision;
    });
  }

  startEdit(): void {
    if (!this.project || !this.canUpdate) {
      return;
    }

    this.formMode = 'edit';
    this.populateFormFromProject();
    this.message = '';
    this.errorMessage = '';
    this.userSearchKeyword = '';
    this.divisionFilter = '';
    this.searchUsers();
  }

  cancelEdit(): void {
    this.formMode = 'view';
    this.populateFormFromProject();
    this.errorMessage = '';
    this.userSearchKeyword = '';
    this.divisionFilter = '';
    this.searchUsers();
  }

  saveProject(form: NgForm): void {
    if (form.invalid || this.saving || !this.canUpdate) {
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
      users: this.allUsers.filter((user: any) => user.checked).map((user : any) => ({
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
    if (this.deleting || !this.projectId || !this.canDelete) {
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

  back(): void {
    history.back();
  }

  convertToTemplate(content: TemplateRef<unknown>): void {
    const today = new Date();
    const version = today.getFullYear()  + String(today.getMonth() + 1).padStart(2, '0')  + String(today.getDate()).padStart(2, '0');
    this.dataTemplate = {
      name:  '',
      description: this.project?.description || '',
      version: version,
    };
    this.templateError = '';
    this.templateModalRef = this.modalService.open(content, {
      centered: true,
      backdrop: 'static',
      keyboard: false,
    });
  }

  closeTemplateModal(): void {
    this.templateModalRef?.close();
    this.templateModalRef = null;
    this.templateError = '';
  }

  submitTemplate(form: NgForm): void {
    if (form.invalid || this.templateSaving || !this.projectId) {
      return;
    }

    const payload = {
      name: this.dataTemplate.name.trim(),
      description: this.dataTemplate.description.trim(),
      version: this.dataTemplate.version.trim(),
    };

    this.templateSaving = true;
    this.templateError = '';
    console.log('Submitting template payload:', payload);
    this.apiService.post(`/project/${this.projectId}/template`, payload).subscribe({
      next: (response) => {
        this.templateSaving = false;
        this.closeTemplateModal();
        this.message = response?.message || 'Template created.';
        this.errorMessage = '';
      },
      error: (error) => {
        this.templateSaving = false;
        this.templateError = error?.error?.message || 'Failed to create template.';
      },
    });
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

  private defaultNewTaskForm(): NewTaskFormModel {
    return {
      title: '',
      description: '',
      ticketCategoryId: null,
      assignTo: '',
      productChildId: '',
    };
  }

  get projectModules(): any[] {
    return Array.isArray(this.project?.modules) ? this.project.modules : [];
  }

  startAddTask(group: any): void {
    this.newTaskForm = this.defaultNewTaskForm();
    this.newTaskForm.ticketCategoryId = Number(group.id);
    this.addTaskGroupId = Number(group.id);
  }

  cancelAddTask(): void {
    this.addTaskGroupId = null;
  }

  onTaskDragStart(t: any): void {
    this.draggedTask = t;
  }

  onTaskDragOver(event: DragEvent): void {
    event.preventDefault();

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  taskDragEnd(): void {
    this.draggedTask = null;
  }

  onTaskDrop(target: any, group: any, event: DragEvent): void {
    event.preventDefault();
    const source = this.draggedTask;
    this.draggedTask = null;

    if (!source || String(source.id) === String(target.id)) {
      return;
    }

    const data = Array.isArray(group?.data) ? group.data : [];
    const sourceIdx = data.findIndex((row: any) => String(row.id) === String(source.id));
    const targetIdx = data.findIndex((row: any) => String(row.id) === String(target.id));

    if (sourceIdx < 0 || targetIdx < 0) {
      return;
    }

    const reordered = [...data];
    reordered.splice(sourceIdx, 1);
    reordered.splice(targetIdx, 0, source);

    reordered.forEach((row: any, index: number) => {
      row.projectSorting = index + 1;
    });

    group.data = reordered;

    const items = reordered.map((row: any) => ({
      id: row.id,
      projectSorting: Number(row.projectSorting),
    }));

    this.apiService.put('/project/task/reorder', { items }).subscribe({
      next: () => {
        // reordered optimistically
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Failed to reorder tasks.';
        this.loadOptions();
      },
    });
  }

  saveNewTask(): void {
    if (this.savingTask || !this.projectId) {
      return;
    }

    if (!this.newTaskForm.title.trim() || !String(this.newTaskForm.assignTo || '').trim()) {
      this.errorMessage = 'Title and Assign To are required.';
      return;
    }

    const payload = {
      title: this.newTaskForm.title.trim(),
      description: this.newTaskForm.description.trim(),
      assignTo: this.newTaskForm.assignTo,
      ticketCategoryId: this.newTaskForm.ticketCategoryId,
      productChildId: this.newTaskForm.productChildId,
    };

    this.savingTask = true;

    this.apiService.post(`/project/${this.projectId}/task`, payload).subscribe({
      next: (response) => {
        this.savingTask = false;
        this.addTaskGroupId = null;
        this.message = response?.message || 'Task created.';
        this.errorMessage = '';
        this.active = 1;
        this.loadOptions();
      },
      error: (error) => {
        this.savingTask = false;
        this.errorMessage = error?.error?.message || 'Failed to create task.';
      },
    });
  }

  openAddContactModal(): void {
    const modalRef = this.modalService.open(AddContactModalComponent, {
      size: 'lg',
      backdrop: 'static',
      keyboard: false,
    });

    modalRef.componentInstance.project = this.project;
    modalRef.componentInstance.contacts = Array.isArray(this.project?.contacts)
      ? this.project.contacts
      : [];

    void modalRef.result.then((result: AddContactModalResult | undefined) => {
      if (!result) {
        return;
      }

      this.loadProjectDetail();
      
      // this.contacts = [
      //   ...this.contacts,
      //   {
      //     id: `TMP-${Date.now()}`,
      //     name: result.name,
      //     email: result.email,
      //     phone: result.phone,
      //     inputDate: new Date().toISOString(),
      //   },
      // ];

      this.message = 'Contact added.';
      this.errorMessage = '';
    }).catch(() => {
      // Ignore dismiss action.
    });
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

  private isChangeRequestTicket(row: any): boolean {
    const ticketTypeName = String(row?.ticketTypeName || '').trim().toLowerCase();
    const ticketTypeCode = String(row?.ticketTypeCode || '').trim().toLowerCase();

    return ticketTypeName.includes('change') || ticketTypeCode === 'cr';
  }

  private filterCrGroups(groups: any[]): any[] {
    if (!Array.isArray(groups) || !groups.some((group) => Array.isArray(group?.data))) {
      // Legacy flat list fallback: filter rows directly.
      return groups.filter((row) => this.isChangeRequestTicket(row));
    }

    return groups
      .map((group) => ({
        ...group,
        data: (Array.isArray(group.data) ? group.data : []).filter((row: any) =>
          this.isChangeRequestTicket(row)
        ),
      }))
      .filter((group) => Array.isArray(group.data) && group.data.length > 0);
  }

  private mergeGroupedWithCategories(groupedTasks: any[]): any[] {
    const categories = Array.isArray(this.ticketChildCategories) ? this.ticketChildCategories : [];
    const result = categories.map((category: any) => {
      const match = groupedTasks.find((group: any) => Number(group?.id) === Number(category.id));

      return {
        id: category.id,
        name: String(category.name || ''),
        sorting: Number(category.sorting ?? category.weight ?? 0),
        data: match && Array.isArray(match.data) ? match.data : [],
      };
    });

    const knownIds = new Set(categories.map((c: any) => Number(c.id)));

    for (const group of groupedTasks) {
      if (!knownIds.has(Number(group.id))) {
        result.push({
          id: group.id,
          name: String(group.name || group.id || 'Unknown'),
          sorting: Number(group.sorting ?? group.weight ?? 0),
          data: Array.isArray(group.data) ? group.data : [],
        });
      }
    }

    return result;
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

  removeSelectedContacts() : void {
     

    const payload = this.contacts.filter(c => c.checkbox)
     
     console.log('Selected contacts:', payload);
     
    const request$ = this.apiService.put(`/project/contact`, payload);

    request$.subscribe({
      next: (response) => {
        this.saving = false;  
        this.loadProjectDetail();  
      },
      error: (error) => {
        this.saving = false;
        alert('Error : ' + (error?.message || 'Unknown error'));
      },
    });
  }

  openTicketDetail(t: any): void {  
    let ticketType = 'tasks';
    
    if(t.ticketTypeId == '2'){
      ticketType = 'cases';
    }
    if(t.ticketTypeId == '3'){
      ticketType = 'change-requests';
    }

    this.router.navigate([ ticketType, t.ticketId]);
  }

}

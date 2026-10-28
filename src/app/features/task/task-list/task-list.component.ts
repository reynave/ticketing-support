import { CommonModule } from '@angular/common';
import {
  Component,
  OnDestroy,
  OnInit,
  TemplateRef,
  ViewChild,
  inject,
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  NgbDatepickerModule,
  NgbModal,
  NgbModalModule,
  NgbModalRef,
} from '@ng-bootstrap/ng-bootstrap';
import { Subscription, firstValueFrom } from 'rxjs';
import { ApiService } from '../../../core/services/api.service'; 
import { AuthService } from '../../../core/services/auth.service';
import { SocketNotificationService } from '../../../core/services/socket-notification.service';

interface TaskFormModel {
  id: string;
  crNoRef: string;
  title: string;
  description: string;
  projectId: string;
  submitBy: string;
  submitDate: any;
  targetCompletionDate: any;
  targetCompletionTime: string;
  assignTo: string;
  taskSolution: string;
  actualCompletionDate: string;
  ticketStatusId: number;
  rating: number;
  ratesBy: number;
  issueNo: string;
  category: number;
  productChildId: string;
}

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbModalModule, NgbDatepickerModule],
  templateUrl: './task-list.component.html',
  styleUrl: './task-list.component.css',
})
export class TaskListComponent implements OnInit, OnDestroy {
  private readonly apiService = inject(ApiService);
  private readonly router = inject(Router);
  private readonly modalService = inject(NgbModal);
  private readonly authService = inject(AuthService);
  private readonly activeRouter = inject(ActivatedRoute);
  private readonly socketNotificationService : any = inject(SocketNotificationService);

  @ViewChild('createTaskModal') createTaskModal?: TemplateRef<unknown>;
  @ViewChild('templateMasterContent') templateMasterContent?: TemplateRef<unknown>;

  private modalRef: NgbModalRef | null = null;
  private templateMasterModalRef: NgbModalRef | null = null;

  readonly moduleId = 5005;

  get canAccessPage(): boolean {
    return this.authService.hasPermission(this.moduleId, 'r');
  }

  get canCreate(): boolean {
    return this.authService.hasPermission(this.moduleId, 'c');
  }

  get canDelete(): boolean {
    return this.authService.hasPermission(this.moduleId, 'd');
  }

  readonly taskTypeId = 1;
  ticketStatusOptions: any[] = [];
  closed: boolean = false;
  rows: any[] = [];
  projects: any[] = [];
  projectFilterOptions: any[] = [];
  internalUsers: any[] = [];
  ticketCategories: any[] = [];
selectedClientId : string = '';
  loading = false;
  loadingOptions = false;
  saving = false;
  deletingId: string | null = null;

  selectChildCategory : any = [];
  message = '';
  errorMessage = '';

  keyword = '';
  selectedProjectId = '';
  selectedTicketStatusId = '1';

  formModel: TaskFormModel = this.defaultForm();
  payload: any = null;
  clients : any[] = [];
  templateName: string = '';
  listOfTemplateMaster: any[] = [];
  loadingTemplateMaster = false;
  templateDetail: any = null;
  private reloadSubscription?: Subscription;
  constructor() {}
  ngOnInit(): void {
    if (!this.canAccessPage) {
      return;
    }

    console.log(this.activeRouter.snapshot.queryParams, this.closed);
    this.payload = this.authService.decodeToken();
    this.reloadSubscription = this.socketNotificationService
      .onReloadAction()
      .subscribe(() => {
        this.loadTasks();
      });
    this.formModel = this.defaultForm();
    this.loadTasks();
   
  }

  ngOnDestroy(): void {
    this.reloadSubscription?.unsubscribe();
  }

  loadTasks(): void {
    this.closed = Boolean(this.activeRouter.snapshot.queryParams['close']);
    this.loading = true;
    this.errorMessage = '';

    const query: any = {
      ticketTypeId: this.taskTypeId,
      closed: 0,
    };
    query['closed'] = this.closed;
    query['matchUserProduct'] = 1;
    if (this.keyword.trim()) {
      query['keyword'] = this.keyword.trim();
    }

    if (this.selectedProjectId !== '') {
      query['projectId'] = this.selectedProjectId;
    }

    if (this.selectedClientId !== '') {
      query['clientId'] = this.selectedClientId;
    }

    if (this.selectedTicketStatusId !== '') {
      query['ticketStatusId'] = Number(this.selectedTicketStatusId);
    }

    this.apiService.get('/ticket', query).subscribe({
      next: (response) => {
        this.loading = false;
        this.rows = Array.isArray(response?.data) ? response.data : [];
        this.buildProjectFilterOptions();
         this.loadOptions();
      },
      error: (error) => {
        this.loading = false;
        this.rows = [];
        this.errorMessage = error?.error?.message || 'Failed to load tasks.';
      },
    });
  }

  async loadOptions(): Promise<void> {
    this.loadingOptions = true;

    try {
      const [projectResponse, clientsResponse, ticketCategoriesResponse, ticketStatusResponse, templateMasterResponse] =
        await Promise.all([
          firstValueFrom(this.apiService.get('/project', { status: 1, matchUserProduct: 1 })),
         firstValueFrom(this.apiService.get('/client', { status: 1, /*userId: this.payload?.id || '' */ })),
         
          firstValueFrom(
            this.apiService.get('/ticket-categories', { status: 1 }),
          ),
          firstValueFrom(
            this.apiService.get('/master/status/task', { status: 1 }),
          ),
          firstValueFrom(
            this.apiService.get('/template', { tempateType: 'task' }),
          ),
        ]);

          this.projects = Array.isArray(projectResponse?.data)
        ? projectResponse.data
        : [];



      const clients = Array.isArray(clientsResponse?.data)
        ? clientsResponse.data
        : [];
        console.log('Clients:', clients);
      this.applyClientFilter(clients);

      
      this.ticketCategories = Array.isArray(ticketCategoriesResponse?.data)
        ? ticketCategoriesResponse.data
        : [];
      this.ticketStatusOptions = Array.isArray(ticketStatusResponse?.data)
        ? ticketStatusResponse.data
        : [];
      this.listOfTemplateMaster = Array.isArray(templateMasterResponse?.data)
        ? templateMasterResponse.data
        : [];
    } catch {
      this.clients = [];
      this.internalUsers = [];
      this.ticketCategories = [];
      this.ticketStatusOptions = [];
      this.listOfTemplateMaster = [];
    } finally {
      this.loadingOptions = false;
    }
  }
  private applyClientFilter(clients: any[]): void {
    if (this.selectedProjectId !== '') {
      const project = this.projects.find(
        (p) => String(p?.id ?? '') === String(this.selectedProjectId),
      );
      const clientId = String(project?.clientId ?? '').trim();
      this.clients = clientId
        ? clients.filter(
            (client: any) => String(client?.id ?? '').trim() === clientId,
          )
        : [];
    } else {
      const clientIdsInTasks = new Set(
        this.rows
          .map((row) => String(row?.clientId ?? '').trim())
          .filter((id) => id !== ''),
      );
      this.clients = clients.filter((client: any) =>
        clientIdsInTasks.has(String(client?.id ?? '').trim()),
      );
    }
  }

  onProjectFilterChange(): void {
    this.selectedClientId = '';
    this.loadTasks();
  }

  private buildProjectFilterOptions(): void {
    const map = new Map<string, any>();
    for (const row of this.rows) {
      const id = String(row?.projectId ?? '').trim();
      if (!id || map.has(id)) {
        continue;
      }
      map.set(id, {
        id,
        name: row?.projectName || id,
        clientName: row?.clientName || '',
      });
    }
    this.projectFilterOptions = Array.from(map.values());
  }


modules : any = [];
  selectTaskCategory(): void {
    

    //  saya mau mendapatkan array this.projects yang memiliki id sama dengan this.formModel.projectId
    const selectedProject = this.projects.find(
      (project) => project.id === this.formModel.projectId,
    );
    console.log('Selected Project:', selectedProject, selectedProject?.ticketCategoriesParentId);
     
    // saya mau mendapatkan array berdsarkan id dari selectedProject?.ticketCategoriesParentId
    const selectedTicketCategories = this.ticketCategories.filter(
      (category) => category.id === selectedProject?.ticketCategoriesParentId,
    );
    this.selectChildCategory = selectedTicketCategories[0]?.children || [];  

    this.internalUsers = selectedProject?.users || [];

    this.modules = selectedProject?.modules || [];
    console.log('Selected Project Modules:', this.modules);
   
  }

  resetFilter(): void {
    this.keyword = '';
    this.selectedProjectId = '';
    this.selectedClientId = '';
    this.selectedTicketStatusId = '';
    this.loadTasks();
  }

  openCreateModal(): void {
    if (!this.createTaskModal || !this.canCreate) {
      return;
    }

    this.formModel = this.defaultForm();
    this.errorMessage = '';
    this.message = '';
    this.templateName = '';
    this.templateDetail = null;
    this.selectChildCategory = [];
    this.internalUsers = [];
    this.modules = [];

    this.modalRef = this.modalService.open(this.createTaskModal, {
      size: 'lg',
      centered: true,
      backdrop: 'static',
    });
  }

  closeModal(): void {
    this.modalRef?.close();
    this.modalRef = null;
  }

  loadTemplateMaster(): void {
    if (!this.templateMasterContent) {
      return;
    }

    this.loadingTemplateMaster = true;
    this.templateMasterModalRef = this.modalService.open(
      this.templateMasterContent,
      { size: 'xl', centered: true },
    );
  }

  closeTemplateMasterModal(): void {
    this.templateMasterModalRef?.close();
    this.templateMasterModalRef = null;
    this.loadingTemplateMaster = false;
  }

  selectTemplateMaster(template: any): void {
    if (!template) {
      return;
    }

    this.templateName = template.name;
    this.loadingTemplateMaster = true;

    this.apiService.get(`/template/${template.id}`).subscribe({
      next: (response) => {
        const templateDetail = response?.data ?? response;
        const parsed = this.parseTaskTemplatePayload(templateDetail);

        this.formModel = {
          ...this.formModel,
          ...parsed,
        };

        this.templateDetail =
          this.tryParseJson(templateDetail?.json) ?? templateDetail?.json ?? null;

        if (this.formModel.projectId) {
          this.selectTaskCategory();
        }

        this.closeTemplateMasterModal();
      },
      error: (error) => {
        console.error('Error loading template detail:', error);
        this.loadingTemplateMaster = false;
        this.errorMessage =
          error?.error?.message || 'Failed to load template.';
      },
    });
  }

  resetTemplate(): void {
    this.templateName = '';
    this.templateDetail = null;
    this.formModel = this.defaultForm();
    this.selectChildCategory = [];
    this.internalUsers = [];
    this.modules = [];
  }

  private parseTaskTemplatePayload(templateDetail: any): Partial<TaskFormModel> {
    const rawJson = templateDetail?.json ?? templateDetail;
    const parsedJson = this.tryParseJson(rawJson);
    const taskData = parsedJson?.task ?? parsedJson;

    return {
      title: String(taskData?.title ?? this.formModel.title),
      description: String(taskData?.description ?? this.formModel.description),
      projectId: String(taskData?.projectId ?? this.formModel.projectId),
      category: Number(
        taskData?.ticketCategoryId ??
          taskData?.category ??
          this.formModel.category,
      ),
      productChildId: String(
        taskData?.productChildId ?? this.formModel.productChildId,
      ),
      assignTo: String(taskData?.assignTo ?? this.formModel.assignTo),
      taskSolution: String(
        taskData?.taskSolution ?? this.formModel.taskSolution,
      ),
      ticketStatusId: Number(
        taskData?.ticketStatusId ?? this.formModel.ticketStatusId,
      ),
      issueNo: String(taskData?.issueNo ?? this.formModel.issueNo),
      crNoRef: String(taskData?.crNoRef ?? this.formModel.crNoRef),
      targetCompletionDate:
        this.parseDate(taskData?.targetCompletionDate) ??
        this.formModel.targetCompletionDate,
      targetCompletionTime:
        this.parseTime(taskData?.targetCompletionDate) ??
        this.formModel.targetCompletionTime,
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
      const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);

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

  private parseTime(value: any): string | null {
    if (!value) {
      return null;
    }

    if (typeof value === 'string') {
      const match = value.match(/(\d{2}):(\d{2})/);

      if (match) {
        return `${match[1]}:${match[2]}`;
      }
    }

    return null;
  }

  saveTask(form: NgForm): void {
    if (form.invalid || this.saving || !this.canCreate) {
      return;
    }

    if (!String(this.formModel.assignTo || '').trim()) {
      this.errorMessage = 'Assign To wajib dipilih.';
      return;
    }

    // get current hh:mm:ss
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const currentTime = `${hours}:${minutes}:${seconds}`;


    const payload = { 
      ticketTypeId: this.taskTypeId,
      //  crNoRef: this.formModel.crNoRef.trim(),
      title: this.formModel.title.trim(),
      description: this.formModel.description.trim(),
      projectId: this.formModel.projectId,
      submitBy: this.payload?.id || '', // Use the decoded token's user ID or default to 1
      submitDate:
        this.formModel.submitDate['year'] +
        '-' +
        String(this.formModel.submitDate['month']).padStart(2, '0') +
        '-' +
        String(this.formModel.submitDate['day']).padStart(2, '0') +
        ' ' +
        currentTime,
      targetCompletionDate:
        this.formModel.targetCompletionDate['year'] +
        '-' +
        String(this.formModel.targetCompletionDate['month']).padStart(2, '0') +
        '-' +
        String(this.formModel.targetCompletionDate['day']).padStart(2, '0') +
        ' ' +
        (this.formModel.targetCompletionTime || '00:00') + ':00',
      assignTo: this.formModel.assignTo,
      taskSolution: this.formModel.taskSolution.trim(),

      ticketStatusId: Number(this.formModel.ticketStatusId), 
      ticketCategoryId: this.formModel.category,
      productChildId: this.formModel.productChildId || null, // Add productChildId to the payload
    };
    console.log('Payload:', payload);

    this.saving = true;
    this.errorMessage = '';
    this.message = '';

    this.apiService.post('/ticket', payload).subscribe({
      next: (response) => {
        this.saving = false;
        this.closeModal();
        this.socketNotificationService.emitReloadAction();

        const id = String(response?.data?.id || '').trim();

        if (id) {
          void this.router.navigate(['/tasks', id]);
          return;
        }

        this.message = response?.message || 'Task created.';
        this.loadTasks();
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage = error?.error?.message || 'Failed to create task.';
      },
    });
  }

  goToDetail(row: any): void {
    const id = String(row?.id || '').trim();

    if (!id) {
      return;
    }

    void this.router.navigate(['/tasks', id]);
  }

  deleteTask(row: any): void {
    if (!this.canDelete) {
      return;
    }

    const id = String(row?.id || '').trim();

    if (!id) {
      return;
    }

    const confirmed = confirm(`Delete task ${id}?`);

    if (!confirmed) {
      return;
    }

    this.deletingId = id;
    this.errorMessage = '';

    this.apiService.delete(`/ticket/${id}`).subscribe({
      next: (response) => {
        this.deletingId = null;
        this.message = response?.message || 'Task deleted.';
        this.loadTasks();
      },
      error: (error) => {
        this.deletingId = null;
        this.errorMessage = error?.error?.message || 'Failed to delete task.';
      },
    });
  }

  statusNameById(id: number): string {
    const found = this.ticketStatusOptions.find(
      (option) => option.id === Number(id),
    );
    return found?.name || String(id || '-');
  }

  trackById(_: number, row: any): any {
    return row?.id;
  }

  private defaultForm(): any {
    const now = new Date();
    const plusSevenDays = new Date();
    plusSevenDays.setDate(plusSevenDays.getDate() + 7);

    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    //const formattedToday = `${yyyy}-${mm}-${dd}`;
    const formattedToday = { year: yyyy, month: Number(mm), day: Number(dd) };

    return {
      id: '',
      crNoRef: '',
      title: '',
      description: '',
      projectId: '',
      productChildId: '',
      submitBy: 1,
      submitDate: formattedToday,
      targetCompletionDate: formattedToday,
      targetCompletionTime: `${String(now.getHours()).padStart(2, '0')}:${String(
        now.getMinutes(),
      ).padStart(2, '0')}`,
      assignTo: '',
      taskSolution: '',
      ticketStatusId: 100,
      rating: 0,
      ratesBy: 0,
      issueNo: '',
      category: 0,
    };
  }

  private toApiDateTime(input: string): string {
    if (!input) {
      return '';
    }

    return input.replace('T', ' ') + ':00';
  }

  private toDateInputValue(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private toDateTimeInputValue(date: Date): string {
    const yyyyMmDd = this.toDateInputValue(date);
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${yyyyMmDd}T${hour}:${minute}`;
  }
}

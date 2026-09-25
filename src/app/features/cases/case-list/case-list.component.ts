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
import { FuncService } from '../../../core/services/func.service';

interface CaseFormModel {
  id: string;
  crNoRef: string;
  title: string;
  description: string;
  projectId: string;
  submitBy: string;
  submitDate: any;
  targetCompletionDate: any;
  assignTo: string;
  taskSolution: string;
  actualCompletionDate: string;
  ticketStatusId: number;
  rating: number;
  ratesBy: number;
  issueNo: string;
  category: number | null;
  severityId: number | null;
  productChildId: number | null;
}

interface TicketStatusOption {
  id: number;
  name: string;
}

@Component({
  selector: 'app-case-list',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbModalModule, NgbDatepickerModule],
  templateUrl: './case-list.component.html',
  styleUrl: './case-list.component.css',
})
export class CaseListComponent implements OnInit, OnDestroy {
  private readonly apiService = inject(ApiService);
  private readonly router = inject(Router);
  private readonly modalService = inject(NgbModal);
  private readonly authService = inject(AuthService);
  private readonly activeRouter = inject(ActivatedRoute);
  private readonly funcSerivce = inject(FuncService)
  private readonly socketNotificationService = inject(
    SocketNotificationService,
  );

  @ViewChild('createCaseModal') createCaseModal?: TemplateRef<unknown>;

  private modalRef: NgbModalRef | null = null;

  readonly moduleId = 5006;

  get canAccessPage(): boolean {
    return this.authService.hasPermission(this.moduleId, 'r');
  }

  get canCreate(): boolean {
    return this.authService.hasPermission(this.moduleId, 'c');
  }

  get canDelete(): boolean {
    return this.authService.hasPermission(this.moduleId, 'd');
  }

  readonly taskTypeId = 2;
  ticketStatusOptions: TicketStatusOption[] = [];
  closed: boolean = false;
  rows: any[] = [];
  projects: any[] = [];
  internalUsers: any[] = [];
  ticketCategories: any[] = [];
  ticketSeverities: any[] = [];
  selectChildCategory: any[] = [];
  selectedClientId = '';
  loading = false;
  loadingOptions = false;
  saving = false;
  deletingId: string | null = null;

  message = '';
  errorMessage = '';

  keyword = '';
  selectedProjectId = '';
  selectedTicketStatusId = '1';
  clients: any[] = [];
  formModel: CaseFormModel = this.defaultForm();
  payload: any = null;
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
        this.loadCases();
      });
    this.formModel = this.defaultForm();
    this.loadCases();
    this.loadOptions();
  }

  ngOnDestroy(): void {
    this.reloadSubscription?.unsubscribe();
  }

  loadCases(): void {
    this.closed = Boolean(this.activeRouter.snapshot.queryParams['close']);
    this.loading = true;
    this.errorMessage = '';

    const query: any = {
      ticketTypeId: this.taskTypeId,
      closed: 0,
    };
    query['closed'] = this.closed;
    if (this.keyword.trim()) {
      query['keyword'] = this.keyword.trim();
    }

    if (this.selectedClientId !== '') {
      query['clientId'] = this.selectedClientId;
    }

    if (this.selectedTicketStatusId !== '') {
      query['ticketStatusId'] = Number(this.selectedTicketStatusId);
    }

    this.apiService.get('/cases', query).subscribe({
      next: (response) => {
        this.loading = false;
        this.rows = Array.isArray(response?.data) ? response.data : [];
      },
      error: (error) => {
        this.loading = false;
        this.rows = [];
        this.errorMessage = error?.error?.message || 'Failed to load cases.';
      },
    });
  }

  async loadOptions(): Promise<void> {
    this.loadingOptions = true;

    try {
      const [
        projectResponse,
        clientResponse,
        ticketCategoriesResponse,
        ticketSeveritiesResponse,
        ticketStatusResponse,
      ] = await Promise.all([
        firstValueFrom(this.apiService.get('/project', { status: 1 })),
        firstValueFrom(this.apiService.get('/client', { status: 1 })),

        firstValueFrom(
          this.apiService.get('/ticket-categories', { status: 1 }),
        ),
        firstValueFrom(
          this.apiService.get('/master/ticket-severities', { status: 1 }),
        ),
        firstValueFrom(
          this.apiService.get('/master/status/cases', { status: 1 }),
        ),
      ]);
      //console.log(projectResponse, this.authService.currentUser.id);
      this.projects = Array.isArray(projectResponse?.data)
        ? projectResponse.data
        : [];

      this.ticketStatusOptions = Array.isArray(ticketStatusResponse?.data)
        ? ticketStatusResponse.data
        : [];

      this.clients = Array.isArray(clientResponse?.data)
        ? clientResponse.data
        : [];

      this.ticketCategories = Array.isArray(ticketCategoriesResponse?.data)
        ? ticketCategoriesResponse.data
        : [];

      this.ticketSeverities = Array.isArray(ticketSeveritiesResponse?.data)
        ? ticketSeveritiesResponse.data
        : [];

      this.ticketSeverities.forEach((el) => {
        el.days =
          el.duration > 24
            ? el.duration / 24 + ' days'
            : el.duration + ' Hours';
      });
      console.log(this.ticketSeverities);
    } catch {
      this.clients = [];
      this.internalUsers = [];
      this.ticketCategories = [];
    } finally {
      this.loadingOptions = false;
    }
  }

  resetFilter(): void {
    this.keyword = '';
    this.selectedProjectId = '';
    this.selectedTicketStatusId = '';
    this.loadCases();
  }

  openCreateModal(): void {
    if (!this.createCaseModal || !this.canCreate) {
      return;
    }

    this.formModel = this.defaultForm();
    this.selectChildCategory = [];
    this.errorMessage = '';
    this.message = '';

    this.modalRef = this.modalService.open(this.createCaseModal, {
      size: 'lg',
      centered: true,
      backdrop: 'static',
    });
  }
  modules: any[] = [];
  selectCaseCategory(): void {
    const selectedProject = this.projects.find(
      (project) => project.id === this.formModel.projectId,
    );

    const selectedTicketCategories = this.ticketCategories.filter(
      (category) => category.id === selectedProject?.ticketCategoriesParentId,
    );

    this.selectChildCategory = selectedTicketCategories[0]?.children || [];

    const hasSelectedCategory = this.selectChildCategory.some(
      (category) => String(category.id) === String(this.formModel.category),
    );

    if (!hasSelectedCategory) {
      this.formModel.category = null;
    }

    this.internalUsers = selectedProject?.users || [];
    this.modules = selectedProject?.modules || [];

    const hasSelectedAssignee = this.internalUsers.some(
      (user) => String(user.id) === String(this.formModel.assignTo),
    );
    if (!hasSelectedAssignee) {
      this.formModel.assignTo = '';
    }

    const hasSelectedModule = this.modules.some(
      (module) => String(module.id) === String(this.formModel.productChildId),
    );
    if (!hasSelectedModule) {
      this.formModel.productChildId = null;
    }
  }

  closeModal(): void {
    this.modalRef?.close();
    this.modalRef = null;
  }
  addHour: number = 0; // Add 3 hours to the current time

  getHours() {
    // buatkan function get Id dari ticketSeverities, lalu ambil value hours dari severityId
    const severity = this.ticketSeverities.find(
      (s: any) => s.id === this.formModel.severityId,
    );

    if (severity) {
      this.addHour = severity.duration || 0;
    } else {
      this.addHour = 0;
    }
    this.calculateCurDateTime();
    console.log(this.curDateTime, this.formModel.submitDate);
  }

  onSubmitDateChange(value: any): void {
    this.formModel.submitDate = value;
    this.calculateCurDateTime();
  }
  private calculateCurDateTime(): void {
    const submitDate = this.formModel.submitDate;
    const now = new Date();

    if (!submitDate) {
      this.curDateTime = null;
      return;
    }

    const dateObj = new Date(
      submitDate.year,
      submitDate.month - 1,
      submitDate.day,
      now.getHours(),
      now.getMinutes(),
      now.getSeconds(),
    );
    this.curDateTime = new Date(
      dateObj.getTime() + this.addHour * 60 * 60 * 1000,
    );
  }

  curDateTime: any = new Date();

  saveCase(form: NgForm): void {
    if (!this.canCreate) {
      return;
    }

    const hasRequiredSelections =
      !!String(this.formModel.projectId || '').trim() &&
      this.formModel.category !== null &&
      this.formModel.severityId !== null &&
      this.formModel.productChildId !== null &&
      !!String(this.formModel.assignTo || '').trim() &&
      !!String(this.formModel.title || '').trim() &&
      !!String(this.formModel.description || '').trim() &&
      !!this.formModel.submitDate &&
      !!this.formModel.targetCompletionDate;

    if (form.invalid || !hasRequiredSelections || this.saving) {
      form.control.markAllAsTouched();
      this.errorMessage = 'Please complete all required fields.';
      return;
    }

    this.calculateCurDateTime();

    const payload = {
      id: this.formModel.id.trim() || undefined,
      ticketTypeId: this.taskTypeId,
      //  crNoRef: this.formModel.crNoRef.trim(),
      title: this.formModel.title.trim(),
      description: this.formModel.description.trim(),
      projectId: this.formModel.projectId,
      submitBy: this.payload?.id || '', // Use the decoded token's user ID or default to 1
      submitDate: this.toApiDateTimeNow(this.formModel.submitDate),
      targetCompletionDate: this.funcSerivce.toMySQLDateTime(this.curDateTime),
      assignTo: this.formModel.assignTo,
      taskSolution: this.formModel.taskSolution.trim(),

      ticketStatusId: Number(this.formModel.ticketStatusId),
      //  rating: Number(this.formModel.rating),
      //  ratesBy: Number(this.formModel.ratesBy),
      severityId: Number(this.formModel.severityId),
      ticketCategoryId: Number(this.formModel.category),
      deadlineDateTime: this.funcSerivce.toMySQLDateTime(this.curDateTime),
      productChildId: Number(this.formModel.productChildId),
    };
    console.log('Payload:', payload);

    this.saving = true;
    this.errorMessage = '';
    this.message = '';

    this.apiService.post('/cases', payload).subscribe({
      next: (response) => {
        this.saving = false;
        this.closeModal();
        this.socketNotificationService.emitReloadAction();

        const id = String(response?.data?.id || '').trim();

        if (id) {
          void this.router.navigate(['/cases', id]);
          return;
        }

        this.message = response?.message || 'Case created.';
        this.loadCases();
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage = error?.error?.message || 'Failed to create case.';
      },
    });
  }

 

  goToDetail(row: any): void {
    const id = String(row?.id || '').trim();

    if (!id) {
      return;
    }

    void this.router.navigate(['/cases', id]);
  }

  deleteCase(row: any): void {
    if (!this.canDelete) {
      return;
    }

    const id = String(row?.id || '').trim();

    if (!id) {
      return;
    }

    const confirmed = confirm(`Delete case ${id}?`);

    if (!confirmed) {
      return;
    }

    this.deletingId = id;
    this.errorMessage = '';

    this.apiService.delete(`/cases/${id}`).subscribe({
      next: (response) => {
        this.deletingId = null;
        this.message = response?.message || 'Case deleted.';
        this.loadCases();
      },
      error: (error) => {
        this.deletingId = null;
        this.errorMessage = error?.error?.message || 'Failed to delete case.';
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
      submitBy: 1,
      submitDate: formattedToday,
      targetCompletionDate: formattedToday,
      assignTo: '',
      taskSolution: '',
      ticketStatusId: 100,
      rating: 0,
      ratesBy: 0,
      issueNo: '',
      category: null,
      severityId: null,
      productChildId: null,
    };
  }

  private toApiDateTimeNow(dateModel: any): string {
    if (!dateModel) {
      return '';
    }

    const year = String(dateModel['year'] || '').padStart(4, '0');
    const month = String(dateModel['month'] || '').padStart(2, '0');
    const day = String(dateModel['day'] || '').padStart(2, '0');

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day} ${hh}:${mm}:${ss}`;
  }

  private toDateInputValue(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

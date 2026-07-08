import { CommonModule } from '@angular/common';
import { Component, OnInit, TemplateRef, ViewChild, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  NgbDatepickerModule,
  NgbModal,
  NgbModalModule,
  NgbModalRef,
} from '@ng-bootstrap/ng-bootstrap';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../core/services/api.service'; 
import { AuthService } from '../../../core/services/auth.service';

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
  category: number;
  severityId : number;
}

@Component({
  selector: 'app-case-list',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbModalModule, NgbDatepickerModule],
  templateUrl: './case-list.component.html',
  styleUrl: './case-list.component.css',
})
export class CaseListComponent implements OnInit{
  private readonly apiService = inject(ApiService);
  private readonly router = inject(Router);
  private readonly modalService = inject(NgbModal);
  private readonly authService = inject(AuthService);
  private readonly activeRouter = inject(ActivatedRoute);

  @ViewChild('createCaseModal') createCaseModal?: TemplateRef<unknown>;

  private modalRef: NgbModalRef | null = null;

  readonly taskTypeId = 2;
  readonly ticketStatusOptions = [
    { id: 1, name: 'Open' },
    { id: 900, name: 'Closed' },
      { id: 990, name: 'Cancelled' },
    
    
  ];
  closed : boolean = false;
  rows: any[] = [];
  projects: any[] = [];
  internalUsers: any[] = [];
  ticketCategories: any[] = [];
  ticketSeverities: any[] = [];

  loading = false;
  loadingOptions = false;
  saving = false;
  deletingId: string | null = null;

  message = '';
  errorMessage = '';

  keyword = '';
  selectedProjectId = '';
  selectedTicketStatusId = '1';
  
  formModel: CaseFormModel = this.defaultForm();
  payload: any = null;
  constructor() { 
  }
  ngOnInit(): void {
   
    console.log(this.activeRouter.snapshot.queryParams, this.closed)
    this.payload = this.authService.decodeToken();
    this.formModel = this.defaultForm();
    this.loadCases();
    this.loadOptions();
  }

  loadCases(): void {
    this.closed = Boolean(this.activeRouter.snapshot.queryParams['close']);
    this.loading = true;
    this.errorMessage = '';

    const query: any = {
      ticketTypeId: this.taskTypeId,
      closed : 0,
    };
    query['closed'] =  this.closed;
    if (this.keyword.trim()) {
      query['keyword'] = this.keyword.trim();
    }

    if (this.selectedProjectId !== '') {
      query['projectId'] = this.selectedProjectId;
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
      const [projectResponse, internalUserResponse, ticketCategoriesResponse, ticketSeveritiesResponse] =
        await Promise.all([
          firstValueFrom(this.apiService.get('/project', { status: 1 })),
          firstValueFrom(
            this.apiService.get('/user', { userTypeId: 1, status: 1 }),
          ),
          firstValueFrom(
            this.apiService.get('/master/ticket-categories', { presence: 1 }),
          ),  
          firstValueFrom(
            this.apiService.get('/master/ticket-severities', { presence: 1 }),
          ),
        ]);

      this.projects = Array.isArray(projectResponse?.data)
        ? projectResponse.data
        : [];

      this.internalUsers = Array.isArray(internalUserResponse?.data)
        ? internalUserResponse.data
        : [];
      this.ticketCategories = Array.isArray(ticketCategoriesResponse?.data)
        ? ticketCategoriesResponse.data
        : [];

        this.ticketSeverities = Array.isArray(ticketSeveritiesResponse?.data)
        ? ticketSeveritiesResponse.data
        : [];

    } catch {
      this.projects = [];
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
    if (!this.createCaseModal) {
      return;
    }

    this.formModel = this.defaultForm();
    this.errorMessage = '';
    this.message = '';

    this.modalRef = this.modalService.open(this.createCaseModal, {
      size: 'lg',
      centered: true,
      backdrop: 'static',
    });
  }

  closeModal(): void {
    this.modalRef?.close();
    this.modalRef = null;
  }

  saveCase(form: NgForm): void {
    if (form.invalid || this.saving) {
      return;
    }

    const payload = {
      id: this.formModel.id.trim() || undefined,
      ticketTypeId: this.taskTypeId,
    //  crNoRef: this.formModel.crNoRef.trim(),
      title: this.formModel.title.trim(),
      description: this.formModel.description.trim(),
      projectId: this.formModel.projectId,
      submitBy: this.payload?.id || '', // Use the decoded token's user ID or default to 1
      submitDate: this.toApiDateTimeNow(this.formModel.submitDate),
      targetCompletionDate: this.toApiDateTimeNow(this.formModel.targetCompletionDate),
      assignTo: this.formModel.assignTo,
      taskSolution: this.formModel.taskSolution.trim(),

      ticketStatusId: Number(this.formModel.ticketStatusId),
    //  rating: Number(this.formModel.rating),
    //  ratesBy: Number(this.formModel.ratesBy),
      severityId: this.formModel.severityId,
      ticketCategoryId: this.formModel.category,
    };
    console.log('Payload:', payload);

    this.saving = true;
    this.errorMessage = '';
    this.message = '';

    this.apiService.post('/cases', payload).subscribe({
      next: (response) => {
        this.saving = false;
        this.closeModal();

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
      assignTo: 1,
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

  private toDateTimeInputValue(date: Date): string {
    const yyyyMmDd = this.toDateInputValue(date);
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${yyyyMmDd}T${hour}:${minute}`;
  }
}


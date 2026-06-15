import { CommonModule } from '@angular/common';
import { Component, TemplateRef, ViewChild, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbModal, NgbModalModule, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';

interface TaskFormModel {
  id: string;
  crNoRef: string;
  title: string;
  description: string;
  projectId: string;
  submitBy: number;
  submitDate: string;
  targetCompletionDate: string;
  assignTo: number;
  taskSolution: string;
  actualCompletionDate: string;
  ticketStatusId: number;
  rating: number;
  ratesBy: number;
  issueNo: string;
}

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbModalModule],
  templateUrl: './task-list.component.html',
  styleUrl: './task-list.component.css',
})
export class TaskListComponent {
  private readonly apiService = inject(ApiService);
  private readonly router = inject(Router);
  private readonly modalService = inject(NgbModal);

  @ViewChild('createTaskModal') createTaskModal?: TemplateRef<unknown>;

  private modalRef: NgbModalRef | null = null;

  readonly taskTypeId = 1;
  readonly ticketStatusOptions = [
    { id: 100, name: 'Open' },
    { id: 101, name: 'Open - Assigned' },
    { id: 105, name: 'Open - On Review' },
    { id: 106, name: 'Open - Submit' },
    { id: 107, name: 'Open - Approved' },
    { id: 300, name: 'Complete - Review' },
    { id: 700, name: 'Tested' },
    { id: 800, name: 'On Progress' },
    { id: 900, name: 'Close' },
    { id: 904, name: 'Cancelled' },
  ];

  rows: any[] = [];
  projects: any[] = [];

  loading = false;
  loadingOptions = false;
  saving = false;
  deletingId: string | null = null;

  message = '';
  errorMessage = '';

  keyword = '';
  selectedProjectId = '';
  selectedTicketStatusId = '';

  formModel: TaskFormModel = this.defaultForm();

  constructor() {
    this.loadTasks();
    this.loadOptions();
  }

  loadTasks(): void {
    this.loading = true;
    this.errorMessage = '';

    const query: Record<string, string | number> = {
      ticketTypeId: this.taskTypeId,
    };

    if (this.keyword.trim()) {
      query['keyword'] = this.keyword.trim();
    }

    if (this.selectedProjectId !== '') {
      query['projectId'] = this.selectedProjectId;
    }

    if (this.selectedTicketStatusId !== '') {
      query['ticketStatusId'] = Number(this.selectedTicketStatusId);
    }

    this.apiService.get('/ticket', query).subscribe({
      next: (response) => {
        this.loading = false;
        this.rows = Array.isArray(response?.data) ? response.data : [];
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
      const projectResponse = await firstValueFrom(this.apiService.get('/project', { status: 1 }));
      this.projects = Array.isArray(projectResponse?.data) ? projectResponse.data : [];
    } catch {
      this.projects = [];
    } finally {
      this.loadingOptions = false;
    }
  }

  resetFilter(): void {
    this.keyword = '';
    this.selectedProjectId = '';
    this.selectedTicketStatusId = '';
    this.loadTasks();
  }

  openCreateModal(): void {
    if (!this.createTaskModal) {
      return;
    }

    this.formModel = this.defaultForm();
    this.errorMessage = '';
    this.message = '';

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

  saveTask(form: NgForm): void {
    if (form.invalid || this.saving) {
      return;
    }

    const payload = {
      id: this.formModel.id.trim() || undefined,
      ticketTypeId: this.taskTypeId,
      crNoRef: this.formModel.crNoRef.trim(),
      title: this.formModel.title.trim(),
      description: this.formModel.description.trim(),
      projectId: this.formModel.projectId,
      submitBy: Number(this.formModel.submitBy),
      submitDate: this.toApiDateTime(this.formModel.submitDate),
      targetCompletionDate: this.formModel.targetCompletionDate,
      assignTo: Number(this.formModel.assignTo),
      taskSolution: this.formModel.taskSolution.trim(),
      actualCompletionDate: this.formModel.actualCompletionDate || this.formModel.targetCompletionDate,
      ticketStatusId: Number(this.formModel.ticketStatusId),
      rating: Number(this.formModel.rating),
      ratesBy: Number(this.formModel.ratesBy),
      issueNo: this.formModel.issueNo.trim(),
    };

    this.saving = true;
    this.errorMessage = '';
    this.message = '';

    this.apiService.post('/ticket', payload).subscribe({
      next: (response) => {
        this.saving = false;
        this.closeModal();

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
    const found = this.ticketStatusOptions.find((option) => option.id === Number(id));
    return found?.name || String(id || '-');
  }

  trackById(_: number, row: any): any {
    return row?.id;
  }

  private defaultForm(): TaskFormModel {
    const now = new Date();
    const plusSevenDays = new Date();
    plusSevenDays.setDate(plusSevenDays.getDate() + 7);

    return {
      id: '',
      crNoRef: '',
      title: '',
      description: '',
      projectId: '',
      submitBy: 1,
      submitDate: this.toDateTimeInputValue(now),
      targetCompletionDate: this.toDateInputValue(plusSevenDays),
      assignTo: 1,
      taskSolution: '',
      actualCompletionDate: this.toDateInputValue(plusSevenDays),
      ticketStatusId: 100,
      rating: 0,
      ratesBy: 0,
      issueNo: '',
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

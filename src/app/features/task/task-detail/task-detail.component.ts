import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Editor, NgxEditorModule, Toolbar } from 'ngx-editor';

import { ApiService } from '../../../core/services/api.service';
 
@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxEditorModule],
  templateUrl: './task-detail.component.html',
  styleUrl: './task-detail.component.css',
})
export class TaskDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly apiService = inject(ApiService);
 
    editor1: any = null;
    editor2: any = null;
  toolbar: Toolbar = [
    ['bold', 'italic'],
    ['underline', 'strike'],
    ['code', 'blockquote'],
    ['ordered_list', 'bullet_list'],
    [{ heading: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] }],
    ['link', 'image'],
    ['text_color', 'background_color'],
    ['align_left', 'align_center', 'align_right', 'align_justify'],
  ];
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

  taskId = '';
  task: any = null;
  projects: any[] = [];
  internalUsers: any[] = [];

  loading = false;
  loadingOptions = false;
  saving = false;
  deleting = false;

  formMode: 'view' | 'edit' = 'view';
  message = '';
  errorMessage = '';

  formModel: any = this.defaultForm();

  ngOnInit(): void {
    this.editor1 = new Editor();
    this.editor2 = new Editor();
    this.taskId = String(this.route.snapshot.paramMap.get('id') || '').trim();

    if (!this.taskId) {
      void this.router.navigate(['/tasks']);
      return;
    }

    this.loadOptions();
    this.loadTaskDetail();
  }
  ngOnDestroy(): void {
    this.editor1.destroy();
    this.editor2.destroy();
  }
  goBack(): void {
    history.back();
  }

  loadTaskDetail(): void {
    this.loading = true;
    this.errorMessage = '';

    this.apiService.get(`/ticket/${this.taskId}`).subscribe({
      next: (response) => {
        this.loading = false;
        this.task = response?.data || null;

        if (Number(this.task?.ticketTypeId) !== this.taskTypeId) {
          this.task = null;
          this.errorMessage = 'Data ini bukan task (ticketTypeId bukan 1).';
          return;
        }

        this.populateFormFromTask();
      },
      error: (error) => {
        this.loading = false;
        this.task = null;
        this.errorMessage =
          error?.error?.message || 'Failed to load task detail.';
      },
    });
  }

  async loadOptions(): Promise<void> {
    this.loadingOptions = true;

    try {
      const [projectResponse, internalUserResponse] = await Promise.all([
        firstValueFrom(this.apiService.get('/project', { status: 1 })),
        firstValueFrom(this.apiService.get('/user', { userTypeId: 1, status: 1 })),
      ]);

      this.projects = Array.isArray(projectResponse?.data)
        ? projectResponse.data
        : [];

      this.internalUsers = Array.isArray(internalUserResponse?.data)
        ? internalUserResponse.data
        : [];
    } catch {
      this.projects = [];
      this.internalUsers = [];
    } finally {
      this.loadingOptions = false;
    }
  }

  userOptionLabel(row: any): string {
    const firstName = String(row?.firstName || '').trim();
    const lastName = String(row?.lastName || '').trim();
    const fullName = `${firstName} ${lastName}`.trim();
    const email = String(row?.email || '').trim();

    if (fullName && email) {
      return `${fullName} (${email})`;
    }

    if (fullName) {
      return fullName;
    }

    if (email) {
      return email;
    }

    return String(row?.id || '-');
  }

  startEdit(): void {
    if (!this.task) {
      return;
    }

    this.formMode = 'edit';
    this.populateFormFromTask();
    this.message = '';
    this.errorMessage = '';
  }

  cancelEdit(): void {
    this.formMode = 'view';
    this.populateFormFromTask();
    this.errorMessage = '';
  }

  saveTask(form: NgForm): void {
    if (form.invalid || this.saving) {
      return;
    }

    const payload = {
      ticketTypeId: this.taskTypeId,
      crNoRef: this.formModel.crNoRef.trim(),
      title: this.formModel.title.trim(),
      description: this.formModel.description.trim(),
      projectId: this.formModel.projectId,
      submitBy: (this.formModel.submitBy),
      submitDate: this.toApiDateTime(this.formModel.submitDate),
      targetCompletionDate: this.formModel.targetCompletionDate,
      assignTo: (this.formModel.assignTo),
      taskSolution: this.formModel.taskSolution.trim(),
      actualCompletionDate: this.formModel.actualCompletionDate,
      ticketStatusId: Number(this.formModel.ticketStatusId),
      rating: Number(this.formModel.rating),
      ratesBy: Number(this.formModel.ratesBy),
      issueNo: this.formModel.issueNo.trim(),
    };
    console.log('saveTask payload', payload);

    this.saving = true;
    this.message = '';
    this.errorMessage = '';

    this.apiService.put(`/ticket/${this.taskId}`, payload).subscribe({
      next: (response) => {
        this.saving = false;
        this.message = response?.message || 'Task updated.';
        this.formMode = 'view';
        this.loadTaskDetail();
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage = error?.error?.message || 'Failed to update task.';
      },
    });
  }

  deleteTask(): void {
    if (this.deleting || !this.taskId) {
      return;
    }

    const confirmed = confirm(`Delete task ${this.taskId}?`);

    if (!confirmed) {
      return;
    }

    this.deleting = true;
    this.errorMessage = '';

    this.apiService.delete(`/ticket/${this.taskId}`).subscribe({
      next: () => {
        this.deleting = false;
        void this.router.navigate(['/tasks']);
      },
      error: (error) => {
        this.deleting = false;
        this.errorMessage = error?.error?.message || 'Failed to delete task.';
      },
    });
  }

  private defaultForm(): any {
    const now = new Date();
    const plusSevenDays = new Date();
    plusSevenDays.setDate(plusSevenDays.getDate() + 7);

    return {
      crNoRef: '',
      title: '',
      description: '',
      projectId: '',
      submitBy: '',
      submitDate: this.toDateTimeInputValue(now),
      targetCompletionDate: this.toDateInputValue(plusSevenDays),
      assignTo: '',
      taskSolution: '',
      actualCompletionDate: this.toDateInputValue(plusSevenDays),
      ticketStatusId: 100,
      rating: 0,
      ratesBy: 0,
      issueNo: '',
    };
  }

  private populateFormFromTask(): void {
    this.formModel = {
      crNoRef: String(this.task?.crNoRef || ''),
      title: String(this.task?.title || ''),
      description: String(this.task?.description || ''),
      projectId: String(this.task?.projectId || ''),
      submitBy: (this.task?.submitBy ),
      submitDate: this.toDateTimeLocalInput(this.task?.submitDate),
      targetCompletionDate: this.toIsoDate(this.task?.targetCompletionDate),
      assignTo: (this.task?.assignTo ),
      taskSolution: String(this.task?.taskSolution || ''),
      actualCompletionDate: this.toIsoDate(this.task?.actualCompletionDate),
      ticketStatusId: Number(this.task?.ticketStatusId ?? 100),
      rating: Number(this.task?.rating ?? 0),
      ratesBy: Number(this.task?.ratesBy ?? 0),
      issueNo: String(this.task?.issueNo || ''),
    };
  }

  private toApiDateTime(input: string): string {
    if (!input) {
      return '';
    }

    return input.replace('T', ' ') + ':00';
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

  private toDateTimeLocalInput(value: unknown): string {
    if (!value) {
      return '';
    }

    const date = new Date(String(value));

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    const yyyyMmDd = this.toDateInputValue(date);
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${yyyyMmDd}T${hour}:${minute}`;
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

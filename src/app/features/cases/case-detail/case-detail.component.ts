import { CommonModule } from '@angular/common';
import {
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { filter, firstValueFrom, map } from 'rxjs';
import { Editor, NgxEditorModule, Toolbar } from 'ngx-editor';
import { UploadService } from './upload.service';
import { ApiService } from '../../../core/services/api.service';
import {
  ModalDismissReasons,
  NgbDatepickerModule,
  NgbModal,
} from '@ng-bootstrap/ng-bootstrap';
import { UploadedFile, UploadResponse } from './upload.model';
import { HttpClient, HttpEventType } from '@angular/common/http';
interface UploadRow {
  files: File[];
  previews: string[];
}
import { environment } from './../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
@Component({
  selector: 'app-case-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxEditorModule, NgbDatepickerModule],
  templateUrl: './case-detail.component.html',
  styleUrl: './case-detail.component.css',
})
export class CaseDetailComponent implements OnInit, OnDestroy {
  // Listens for Ctrl + S globally on the document
  @HostListener('document:keydown.control.s', ['$event'])
  onKeydownHandler(event: KeyboardEvent) {
    event.preventDefault(); // Stops the browser's default Save Page dialog
    console.log('Ctrl + S pressed');
    this.saveCase(); // Calls your custom function
  }

  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly apiService = inject(ApiService);

  private readonly uploadService = inject(UploadService);
  private readonly http = inject(HttpClient);
  private modalService = inject(NgbModal);
  editor1: any = null;
  editor2: any = null;
  editor3: any = null;

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
  readonly taskTypeId = 2;
  ticketStatusOptions: any = [];
  ticketSeverities: any = [];
  taskId = '';
  task: any = null;
  projects: any[] = [];
  internalUsers: any[] = [];
  ticketCategories: any[] = [];
  relatedTasks: any[] = [];

  loading = false;
  loadingOptions = false;
  saving = false;
  deleting = false;
  loadingRelatedTasks = false;
  savingRelatedTask = false;

  formMode: 'view' | 'edit' = 'view';
  message = '';

  errorMessage: string | null = null;
  taskLogs: any = [];
  formModel: any = this.defaultForm();
  relatedTaskForm: any = this.defaultRelatedTaskForm();

  descriptionLog: string = '';

  rows: UploadRow[] = [{ files: [], previews: [] }];
  uploadedFiles: UploadedFile[] = [];
  progress = 0;
  isUploading = false;

  logId: number = 0;

  replyLog: any = {
    id: 0,
    description: '',
  };
  ticketStatusId: number = 0;
  remainingTime: any = 'test';
  me: any = {};
  ngOnInit(): void {
    this.me = this.authService.decodeToken();
    this.editor1 = new Editor();
    this.editor2 = new Editor();
    this.editor3 = new Editor();
    this.taskId = String(this.route.snapshot.paramMap.get('id') || '').trim();

    if (!this.taskId) {
      void this.router.navigate(['/cases']);
      return;
    }

    this.loadOptions();
    this.loadTaskDetail();
    this.loadTaskDetailLog();
    this.loadRelatedTasks();
  }
  ngOnDestroy(): void {
    this.editor1.destroy();
    this.editor2.destroy();
    this.editor3.destroy();
  }
  goBack(): void {
    history.back();
  }

  loadTaskDetail(): void {
    this.loading = true;
    this.errorMessage = '';

    this.apiService.get(`/cases/${this.taskId}`).subscribe({
      next: (response) => {
        this.loading = false;
        this.task = response?.data || null;
        this.ticketStatusId = this.task.ticketStatusId;
        if (Number(this.task?.ticketTypeId) !== this.taskTypeId) {
          this.task = null;
          this.errorMessage = 'Data ini bukan case (ticketTypeId bukan 2).';
          return;
        }
        this.remainingTime = this.task.submitDate;
        this.populateFormFromTask();
      },
      error: (error) => {
        this.loading = false;
        this.task = null;
        this.errorMessage =
          error?.error?.message || 'Failed to load case detail.';
      },
    });
  }
  loadTaskDetailLog(): void {
    this.loading = true;
    this.errorMessage = '';

    this.apiService.get(`/cases/${this.taskId}/logs`).subscribe({
      next: (response) => {
        this.loading = false;
        this.taskLogs = response?.data || [];
      },
      error: (error) => {
        this.loading = false;
        this.task = null;
        this.errorMessage =
          error?.error?.message || 'Failed to load case detail.';
      },
    });
  }

  open(content: any, log: any = []): void {
    if (log.id != 0) {
      this.replyLog.id = log.id;
      this.replyLog.description = log.description;
    }

    this.modalService.open(content, { size: 'lg' }).result.then(
      (result) => {
        //this.closeResult = `Closed with: ${result}`;
      },
      (reason) => {
        //this.closeResult = `Dismissed ${this.getDismissReason(reason)}`;
      },
    );
  }

  async loadOptions(): Promise<void> {
    this.loadingOptions = true;

    try {
      const [
        projectResponse,
        internalUserResponse,
        ticketStatusResponse,
        ticketSeverityResponse,
        ticketCategoriesResponse,
      ] = await Promise.all([
        firstValueFrom(this.apiService.get('/project', { status: 1 })),
        firstValueFrom(
          this.apiService.get('/user', { presence: 1, status: 1 }),
        ),
        firstValueFrom(
          this.apiService.get('/master/ticketStatus', { presence: 1 }),
        ),
        firstValueFrom(
          this.apiService.get('/master/ticketSeverity', { presence: 1 }),
        ),
        firstValueFrom(
          this.apiService.get('/master/ticket-categories', { presence: 1 }),
        ),
      ]);
      this.ticketStatusOptions = Array.isArray(ticketStatusResponse?.data)
        ? ticketStatusResponse.data
        : [];

      this.projects = Array.isArray(projectResponse?.data)
        ? projectResponse.data
        : [];

      this.internalUsers = Array.isArray(internalUserResponse?.data)
        ? internalUserResponse.data
        : [];

      this.ticketSeverities = Array.isArray(ticketSeverityResponse?.data)
        ? ticketSeverityResponse.data
        : [];

      this.ticketCategories = Array.isArray(ticketCategoriesResponse?.data)
        ? ticketCategoriesResponse.data
        : [];
    } catch {
      this.projects = [];
      this.internalUsers = [];
      this.ticketStatusOptions = [];
      this.ticketSeverities = [];
      this.ticketCategories = [];
    } finally {
      this.loadingOptions = false;
    }
  }

  loadRelatedTasks(): void {
    this.loadingRelatedTasks = true;

    this.apiService
      .get(`/cases/${this.taskId}/tasks`)
      .subscribe({
        next: (response) => {
          this.loadingRelatedTasks = false;
          this.relatedTasks = Array.isArray(response?.data) ? response.data : [];
        },
        error: () => {
          this.loadingRelatedTasks = false;
          this.relatedTasks = [];
        },
      });
  }

  openCreateTask(content: any): void {
    this.relatedTaskForm = this.defaultRelatedTaskForm();
    this.relatedTaskForm.projectId = String(this.task?.projectId || '');
    this.relatedTaskForm.assignTo = Number(this.task?.assignTo || 0);
    this.relatedTaskForm.title = `Task of ${this.taskId}`;
    this.relatedTaskForm.description = `Follow up from case ${this.taskId}`;
    this.modalService.open(content, { size: 'lg', centered: true });
  }

  saveRelatedTask(form: NgForm): void {
    if (form.invalid || this.savingRelatedTask) {
      return;
    }

    const payload = {
      ticketTypeId: 1,
      title: String(this.relatedTaskForm.title || '').trim(),
      description: String(this.relatedTaskForm.description || '').trim(),
      projectId: this.relatedTaskForm.projectId,
      submitBy: this.me?.id,
      submitDate: this.toApiDate(this.relatedTaskForm.submitDate),
      targetCompletionDate: this.toApiDate(
        this.relatedTaskForm.targetCompletionDate,
      ),
      assignTo: this.relatedTaskForm.assignTo,
      taskSolution: '',
      ticketStatusId: Number(this.relatedTaskForm.ticketStatusId || 100),
      ticketCategoryId: Number(this.relatedTaskForm.ticketCategoryId || 0),
    };

    this.savingRelatedTask = true;
    this.errorMessage = '';

    this.apiService.post(`/cases/${this.taskId}/tasks`, payload).subscribe({
      next: () => {
        this.savingRelatedTask = false;
        this.modalService.dismissAll();
        this.loadRelatedTasks();
      },
      error: (error) => {
        this.savingRelatedTask = false;
        this.errorMessage =
          error?.error?.message || 'Failed to create related task.';
      },
    });
  }

  goToTaskDetail(row: any): void {
    const id = String(row?.id || '').trim();

    if (!id) {
      return;
    }

    void this.router.navigate(['/tasks', id]);
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

  onStatusChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    console.log('selected value:', value);
    console.log('dari ngModel:', this.formModel.ticketStatusId);
  }

  saveCase() {
    if (this.formModel.ticketStatusId >= 900) {
      const confirmed = confirm(`Are you sure close case ${this.taskId}?`);

      if (!confirmed) {
        return;
      } else {
        this.updateTask();
      }
    } else {
      this.updateTask();
    }
  }

  updateTask(): void {
    // if (form.invalid || this.saving) {
    //   return;
    // }

    const targetCompletionDate =
      this.formModel.targetCompletionDate['year'] +
      '-' +
      String(this.formModel.targetCompletionDate['month']).padStart(2, '0') +
      '-' +
      String(this.formModel.targetCompletionDate['day'] + 1).padStart(2, '0');

    const actualCompletionDate =
      this.formModel.actualCompletionDate['year'] +
      '-' +
      String(this.formModel.actualCompletionDate['month']).padStart(2, '0') +
      '-' +
      String(this.formModel.actualCompletionDate['day'] + 1).padStart(2, '0');

    const payload = {
      ticketTypeId: this.taskTypeId,
      title: this.formModel.title.trim(),
      description: this.formModel.description.trim(),
      projectId: this.formModel.projectId,
      submitBy: this.formModel.submitBy,
      submitDate: this.toApiDateTime(this.formModel.submitDate),
      targetCompletionDate: targetCompletionDate,
      assignTo: this.formModel.assignTo,
      taskSolution: this.formModel.taskSolution.trim(),
      actualCompletionDate: actualCompletionDate,
      ticketStatusId: Number(this.formModel.ticketStatusId),
      rating: Number(this.formModel.rating),
      ratesBy: Number(this.formModel.ratesBy),
      issueNo: this.formModel.issueNo.trim(),
      wasTicketStatusId: this.ticketStatusId,
      updateBy: this.formModel.submitBy,
      ticketSeverityId: Number(this.formModel.ticketSeverityId),
    };
    console.log('saveTask payload', payload);

    this.saving = true;
    this.message = '';
    this.errorMessage = '';

    this.apiService.put(`/cases/${this.taskId}`, payload).subscribe({
      next: (response) => {
        this.saving = false;
        this.message = response?.message || 'Case updated.';
        this.formMode = 'view';
        this.loadTaskDetail();
        this.loadTaskDetailLog();
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage = error?.error?.message || 'Failed to update case.';
      },
    });
  }

  submitRate() {
    console.log(this.me);
    const payload = {
      taskSolution: this.formModel.taskSolution.trim(),
      rating: Number(this.formModel.rating),
      ratesBy: this.me.id,
      updateBy: this.me.id,
    };
    console.log('submitRate payload', payload);

    this.saving = true;
    this.message = '';
    this.errorMessage = '';

    this.apiService.put(`/cases/${this.taskId}/submitRate`, payload).subscribe({
      next: (response) => {
        this.saving = false;
        this.message = response?.message || 'Case updated.';
        this.formMode = 'view';
        this.loadTaskDetail();
        this.loadTaskDetailLog();
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage = error?.error?.message || 'Failed to update case.';
      },
    });
  }

  deleteTask(): void {
    if (this.deleting || !this.taskId) {
      return;
    }

    const confirmed = confirm(`Delete case ${this.taskId}?`);

    if (!confirmed) {
      return;
    }

    this.deleting = true;
    this.errorMessage = '';

    this.apiService.delete(`/cases/${this.taskId}`).subscribe({
      next: () => {
        this.deleting = false;
        history.back();
      },
      error: (error) => {
        this.deleting = false;
        this.errorMessage = error?.error?.message || 'Failed to delete case.';
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
      ticketSeverityId: 0,
    };
  }

  private defaultRelatedTaskForm(): any {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    return {
      title: '',
      description: '',
      projectId: '',
      submitDate: {
        year: today.getFullYear(),
        month: today.getMonth() + 1,
        day: today.getDate(),
      },
      targetCompletionDate: {
        year: nextWeek.getFullYear(),
        month: nextWeek.getMonth() + 1,
        day: nextWeek.getDate(),
      },
      assignTo: 0,
      ticketStatusId: 100,
      ticketCategoryId: 0,
    };
  }

  private toApiDate(dateModel: any): string {
    if (!dateModel || !dateModel.year || !dateModel.month || !dateModel.day) {
      return '';
    }

    return `${dateModel.year}-${String(dateModel.month).padStart(2, '0')}-${String(dateModel.day).padStart(2, '0')}`;
  }

  private populateFormFromTask(): void {
    let [yyyy, mm, dd] =
      this.task?.targetCompletionDate.split('T')[0].split('-') || [];
    const targetCompletionDate = {
      year: Number(yyyy),
      month: Number(mm),
      day: Number(dd),
    };

    [yyyy, mm, dd] =
      this.task?.actualCompletionDate.split('T')[0].split('-') || [];
    const actualCompletionDate = {
      year: Number(yyyy),
      month: Number(mm),
      day: Number(dd),
    };

    this.formModel = {
      crNoRef: String(this.task?.crNoRef || ''),
      title: String(this.task?.title || ''),
      description: String(this.task?.description || ''),
      projectId: String(this.task?.projectId || ''),
      submitBy: this.task?.submitBy,
      submitDate: this.toDateTimeLocalInput(this.task?.submitDate),
      targetCompletionDate: targetCompletionDate,
      assignTo: this.task?.assignTo,
      taskSolution: String(this.task?.taskSolution || ''),
      actualCompletionDate: actualCompletionDate,
      ticketStatusId: Number(this.task?.ticketStatusId ?? 100),
      rating: Number(this.task?.rating ?? 0),
      ratesBy: Number(this.task?.ratesBy ?? 0),
      issueNo: String(this.task?.issueNo || ''),
      ticketSeverityId: Number(this.task?.ticketSeverityId ?? 0),
    };
  }

  private toApiDateTime(input: string): string {
    if (!input) {
      return '';
    }

    return input.replace('T', ' ') + ':00';
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

  get allFiles(): File[] {
    return this.rows.flatMap((row) => row.files);
  }

  addRow(): void {
    this.rows.push({ files: [], previews: [] });
  }

  removeRow(rowIndex: number): void {
    if (this.rows.length === 1) return;
    this.rows = this.rows.filter((_, i) => i !== rowIndex);
  }

  onFileSelected(event: Event, rowIndex: number): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const files = Array.from(input.files);
    this.rows[rowIndex].files = files;
    this.rows[rowIndex].previews = [];

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.rows[rowIndex].previews.push(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    });
  }

  removeFile(rowIndex: number, fileIndex: number): void {
    this.rows[rowIndex].files = this.rows[rowIndex].files.filter(
      (_, i) => i !== fileIndex,
    );
    this.rows[rowIndex].previews = this.rows[rowIndex].previews.filter(
      (_, i) => i !== fileIndex,
    );
  }

  submitActivity(): void {
    this.saving = true;
    this.message = '';
    this.errorMessage = '';

    const formData = new FormData();
    formData.append('ticketId', this.taskId);
    formData.append('description', this.descriptionLog.trim());
    formData.append('submitBy', this.formModel.submitBy);
    formData.append('parentId', this.replyLog.id || '');

    // Append semua file dari semua rows
    this.allFiles.forEach((file) => {
      formData.append('files', file);
    });

    // Kirim sekaligus — text fields + files dalam 1 request
    this.http
      .post(`${environment.apiBaseUrl}/cases/log/${this.taskId}`, formData, {
        reportProgress: true,
        observe: 'events',
      })
      .pipe(
        map((event) => {
          if (event.type === HttpEventType.UploadProgress && event.total) {
            this.progress = Math.round((event.loaded / event.total) * 100);
            this.isUploading = true;
          }
          if (event.type === HttpEventType.Response) {
            return event.body;
          }
          return null;
        }),
        filter((result) => result !== null),
      )
      .subscribe({
        next: (response: any) => {
          this.saving = false;
          this.isUploading = false;
          this.progress = 0;
          this.descriptionLog = '';
          this.rows = [{ files: [], previews: [] }];
          this.message = response?.message || 'Activity submitted.';
          this.formMode = 'view';
          this.modalService.dismissAll();
          this.loadTaskDetailLog();
        },
        error: (error) => {
          this.saving = false;
          this.isUploading = false;
          this.errorMessage =
            error?.error?.message || 'Failed to submit activity.';
        },
      });
  }

  imgUrlLog: string = '';
  imgPopup(content: any, item: any) {
    this.imgUrlLog = item.url;
    this.modalService.open(content, { size: 'lg' });
  }
}

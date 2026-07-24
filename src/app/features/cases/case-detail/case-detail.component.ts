import { CommonModule } from '@angular/common';
import {
  Component,
  HostListener,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { filter, firstValueFrom, map } from 'rxjs';
import { Editor, NgxEditorModule, Toolbar } from 'ngx-editor';
import { UploadService } from './upload.service';
import { ApiService } from '../../../core/services/api.service';
import {
  ModalDismissReasons,
  NgbDatepickerModule,
  NgbDateStruct,
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
import { CountdownComponent } from './countdown.component';
import { CaseCreateTaskModalComponent } from '../../../core/components/case-create-task-modal/case-create-task-modal.component';
@Component({
  selector: 'app-case-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgxEditorModule,
    NgbDatepickerModule,
    CountdownComponent,
    CaseCreateTaskModalComponent,
    RouterLink
  ],
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
  projects: any = [];
  internalUsers: any[] = [];
  ticketCategories: any[] = [];
  relatedTasks: any[] = [];
  contacts: any = [];
  loading = false;
  loadingOptions = false;
  saving = false;
  deleting = false;
  loadingRelatedTasks = false;

  formMode: 'view' | 'edit' = 'view';
  message = '';

  errorMessage: string | null = null;
  taskLogs: any = [];
  formModel: any = this.defaultForm();

  descriptionLog: string = '';

  starDateTime = {
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    day: new Date().getDate(),
  };
  closeDateTime: NgbDateStruct | null = null;
  starTime: string = '';
  closeTime: string = '';

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
  deadlineDateTime: string = '';
  assignTo: string = '';
  inputDate: string = '';
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
  onFinished() {
    console.log('Countdown selesai!');
  }
  projectId: string = '';
  taskCount: number = 100;
  ticketBased: number = 0;
  loadTaskDetail(): void {
    this.loading = true;
    this.errorMessage = '';

    this.apiService.get(`/cases/${this.taskId}`).subscribe({
      next: (response) => {
        this.loading = false;
        this.task = response?.data || null;
        this.ticketStatusId = this.task.ticketStatusId;
        this.deadlineDateTime = this.task.deadlineDateTime;
        this.inputDate = this.task.inputDate;
        this.assignTo = this.task.assignTo;
        this.projectId = this.task.projectId;
        this.ticketBased = this.task.ticketBased;
        if (Number(this.task?.ticketTypeId) !== this.taskTypeId) {
          this.task = null;
          this.errorMessage = 'Data ini bukan case (ticketTypeId bukan 2).';
          return;
        }
        this.remainingTime = this.task.submitDate;
        this.populateFormFromTask();

        this.loadOptions();
        this.taskCount = Number(this.task?.taskCount || 0);
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
    const today = new Date();

    this.starDateTime = {
      year: today.getFullYear(),
      month: today.getMonth() + 1,
      day: today.getDate(),
    };

    this.closeDateTime = {
      year: today.getFullYear(),
      month: today.getMonth() + 1,
      day: today.getDate(),
    };

    this.starTime = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;
    this.closeTime = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes() + 1).padStart(2, '0')}`;

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
ticketBalance : number = 0;
  async loadOptions(): Promise<void> {
    this.loadingOptions = true;

    try {
      const [projectResponse, ticketStatusResponse, ticketSeverityResponse] =
        await Promise.all([
          firstValueFrom(this.apiService.get(`/project/${this.projectId}`)),

          firstValueFrom(
            this.apiService.get('/master/status/cases', { presence: 1 }),
          ),
          firstValueFrom(
            this.apiService.get('/master/ticketSeverity', { presence: 1 }),
          ),
        ]);
      this.ticketStatusOptions = Array.isArray(ticketStatusResponse?.data)
        ? ticketStatusResponse.data
        : [];

  
      this.projects =projectResponse.data; 
        this.ticketBalance = Number(projectResponse.data?.ticketBalance?.balance || 0);

      this.internalUsers = projectResponse.data?.users || [];

      this.ticketSeverities = Array.isArray(ticketSeverityResponse?.data)
        ? ticketSeverityResponse.data
        : [];

      this.ticketCategories = projectResponse.data?.ticketCategories || [];
      this.contacts = projectResponse.data?.contacts || [];

      console.log(
        'this.ticketCategories',
        this.ticketCategories,
        this.internalUsers,
      );
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

    this.apiService.get(`/cases/${this.taskId}/tasks`).subscribe({
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

  onRelatedTaskCreated(): void {
    this.loadRelatedTasks();
  }

  onRelatedTaskFailed(message: string): void {
    this.errorMessage = message;
  }

  goToTaskDetail(row: any): void {
    const id = String(row?.id || '').trim();

    if (!id) {
      return;
    }

    void this.router.navigate(['/tasks', id]);
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

    // buatkan function get Id dari ticketSeverities, lalu ambil value hours dari severityId
    const severity = this.ticketSeverities.find(
      (s: any) => Number(s.id) === Number(this.formModel.ticketSeverityId),
    );
    if (severity) {
      this.addHour = Number(severity.duration || 0);
    } else {
      this.addHour = 0;
    }
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
  addHour: number = 0; // Add 3 hours to the current time
  updateTask(): void {
    // if (form.invalid || this.saving) {
    //   return;
    // }

    // const targetCompletionDate =
    //   this.formModel.targetCompletionDate['year'] +
    //   '-' +
    //   String(this.formModel.targetCompletionDate['month']).padStart(2, '0') +
    //   '-' +
    //   String(this.formModel.targetCompletionDate['day'] + 1).padStart(2, '0');

    // const actualCompletionDate =
    //   this.formModel.actualCompletionDate['year'] +
    //   '-' +
    //   String(this.formModel.actualCompletionDate['month']).padStart(2, '0') +
    //   '-' +
    //   String(this.formModel.actualCompletionDate['day'] + 1).padStart(2, '0');

    const today = new Date(this.inputDate);
    console.log('this.inputDate', this.inputDate, today);

    const severity = this.ticketSeverities.find(
      (s: any) => Number(s.id) === Number(this.formModel.ticketSeverityId),
    );
    this.addHour = Number(severity?.duration || 0);

    console.log('addHour', this.addHour);

    // saya mau this.inputDate + this.addHour jam, lalu jadikan deadlineDateTime
    const deadlineDate = new Date(
      today.getTime() + this.addHour * 60 * 60 * 1000,
    );

    const deadlineDateTime =
      deadlineDate.getFullYear() +
      '-' +
      String(deadlineDate.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(deadlineDate.getDate()).padStart(2, '0') +
      ' ' +
      String(deadlineDate.getHours()).padStart(2, '0') +
      ':' +
      String(deadlineDate.getMinutes()).padStart(2, '0') +
      ':' +
      String(deadlineDate.getSeconds()).padStart(2, '0');

    const payload = {
      ticketTypeId: this.taskTypeId,
      title: this.formModel.title.trim(),
      description: this.formModel.description.trim(),
      projectId: this.formModel.projectId,
      submitBy: this.formModel.submitBy,
      submitDate: this.toApiDateTime(this.formModel.submitDate),
      // targetCompletionDate: targetCompletionDate,
      assignTo: this.formModel.assignTo,
      taskSolution: this.formModel.taskSolution.trim(),
      // actualCompletionDate: actualCompletionDate,
      ticketStatusId: Number(this.formModel.ticketStatusId),
      rating: Number(this.formModel.rating),
      ratesBy: Number(this.formModel.ratesBy),
      issueNo: this.formModel.issueNo.trim(),
      wasTicketStatusId: this.ticketStatusId,
      wasAssignTo: this.assignTo,
      updateBy: this.formModel.submitBy,
      ticketSeverityId: Number(this.formModel.ticketSeverityId),
      deadlineDateTime: deadlineDateTime,
      ticketEstimationCost : this.formModel.ticketEstimationCost,
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
      ticketEstimationCost: 0,
    };
  }

  private populateFormFromTask(): void {
    const now = new Date();
    const plusSevenDays = new Date();
    plusSevenDays.setDate(plusSevenDays.getDate() + 7);

    const targetCompletionDate = this.toDateStruct(
      this.task?.targetCompletionDate,
      plusSevenDays,
    );

    const actualCompletionDate = this.toDateStruct(
      this.task?.actualCompletionDate,
      plusSevenDays,
    );

    this.formModel = {
      crNoRef: String(this.task?.crNoRef || ''),
      title: String(this.task?.title || ''),
      description: String(this.task?.description || ''),
      projectId: String(this.task?.projectId || ''),
      submitBy: this.task?.submitBy,
      submitDate: this.toDateTimeLocalInput(this.task?.submitDate),
      targetCompletionDate: this.task?.targetCompletionDate,
      assignTo: this.task?.assignTo,
      taskSolution: String(this.task?.taskSolution || ''),
      actualCompletionDate: this.task?.actualCompletionDate,
      ticketStatusId: Number(this.task?.ticketStatusId ?? 100),
      rating: Number(this.task?.rating ?? 0),
      ratesBy: Number(this.task?.ratesBy ?? 0),
      issueNo: String(this.task?.issueNo || ''),
      ticketSeverityId: Number(this.task?.ticketSeverityId ?? 0),
      ticketEstimationCost : Number(this.task?.ticketEstimationCost ?? 0),
    };
  }

  private toDateStruct(
    value: unknown,
    fallbackDate: Date,
  ): {
    year: number;
    month: number;
    day: number;
  } {
    const parsed = value ? new Date(String(value)) : new Date(fallbackDate);

    const safeDate = Number.isNaN(parsed.getTime())
      ? new Date(fallbackDate)
      : parsed;

    return {
      year: safeDate.getFullYear(),
      month: safeDate.getMonth() + 1,
      day: safeDate.getDate(),
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

  private toSqlDateTime(
    value: NgbDateStruct | null,
    timeValue: string,
  ): string {
    if (!value?.year || !value?.month || !value?.day) {
      return '';
    }

    const normalizedTime = String(timeValue || '').trim();

    if (!normalizedTime) {
      return '';
    }

    const year = String(value.year).padStart(4, '0');
    const month = String(value.month).padStart(2, '0');
    const day = String(value.day).padStart(2, '0');

    const [hour = '00', minute = '00'] = normalizedTime.split(':');
    const safeHour = String(hour).padStart(2, '0');
    const safeMinute = String(minute).padStart(2, '0');

    return `${year}-${month}-${day} ${safeHour}:${safeMinute}:00`;
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
    const starDateTime = this.toSqlDateTime(this.starDateTime, this.starTime);
    const closeDateTime = this.toSqlDateTime(
      this.closeDateTime,
      this.closeTime,
    );

    if (!starDateTime || !closeDateTime) {
      this.saving = false;
      this.errorMessage = 'Start Date Time dan Close Date Time wajib diisi.';
      return;
    }

    formData.append('starDateTime', starDateTime);
    formData.append('closeDateTime', closeDateTime);
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

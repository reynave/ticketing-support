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
import { SocketNotificationService } from '../../../core/services/socket-notification.service';
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
    RouterLink,
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
  private readonly socketNotificationService: any = inject(
    SocketNotificationService,
  );

  readonly moduleId = 5006;

  get canAccessPage(): boolean {
    return this.authService.hasPermission(this.moduleId, 'r');
  }

  get canUpdate(): boolean {
    return this.authService.hasPermission(this.moduleId, 'u');
  }

  get canDelete(): boolean {
    return this.authService.hasPermission(this.moduleId, 'd');
  }

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
ticketStatusName : string = '';
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
  ticketCategoryOptions: any = [];

  /** Jumlah jam SLA yang ditambahkan ke jam sekarang (responseTime -> targetCompletationTime). */
  addHour: number = 3;
  ticketSolutionTime: any = [];
  /** Tanggal hari ini (dipakai ngbDatepicker). */
  responseDate: NgbDateStruct = this.currentDateStruct();

  /** Jam hari ini yang sedang berjalan, format HH:mm (dipakai <input type="time">). */
  responseTime: string = this.currentTimeValue();

  /** Tanggal hari ini untuk target completion. */
  targetCompletationDate: NgbDateStruct = this.currentDateStruct();

  /** Jam target = jam sekarang + addHour jam, format HH:mm. */
  targetCompletationTime: string = this.currentTimeValue(
    this.offsetDate(new Date(), this.addHour),
  );

  ngOnInit(): void {
    if (!this.canAccessPage) {
      return;
    }

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

  /**
   * Dipanggil setiap kali Response DateTime / Target Completion DateTime berubah.
   * Menghitung selisih jam antara Target Completion dan Response DateTime
   * lalu menyimpannya ke `addHour`.
   */
  onSubmitDateChange(): void {
   

    
      const responseDateTime = this.toLocalDateTime(
        this.responseDate,
        this.responseTime,
      );
      const targetCompletationDateTime = this.toLocalDateTime(
        this.targetCompletationDate,
        this.targetCompletationTime,
      );
    
      if (!responseDateTime || !targetCompletationDateTime) {
        this.addHour = 0;

        return;
      }

 

    const diffInHours =
      (targetCompletationDateTime.getTime() - responseDateTime.getTime()) /
      (1000 * 60 * 60);

    // dibulatkan 2 desimal agar bebas dari noise floating point (mis. 2.9999999999999996)
    this.addHour = Math.max(0, Math.round(diffInHours * 100) / 100);

    console.log(
      this.toSqlDateTime(this.responseDate, this.responseTime),
      this.toSqlDateTime(
        this.targetCompletationDate,
        this.targetCompletationTime,
      ),
    );

    console.log('selisih jam =', this.addHour);
    const weekendHours = this.getWeekendHours(
      responseDateTime,
      targetCompletationDateTime,
    );

    // dibulatkan 2 desimal agar bebas dari noise floating point
    this.addHour = Math.max(
      0,
      Math.round((diffInHours - weekendHours) * 100) / 100,
    );
    const solution = this.getSolutionTime(this.addHour);
    console.log(this.addHour, this.ticketSolutionTime, solution);
    this.solution = solution;
    // addHour formula Ticket Solution Time
  }
  /** Tier ticket solution time yang terpilih (selalu object, tidak pernah undefined). */
  solution: any = {};

  /**
   * Mencari tier ticket solution time pertama yang durasinya >= `hour`.
   *
   * PENTING: method ini tidak boleh mengembalikan `undefined`, karena template
   * membacanya sebagai `solution.color / solution.name / solution.duration`.
   * `.find()` akan mengembalikan `undefined` bila `hour` melebihi seluruh tier
   * atau tabelnya kosong, dan itu memicu
   * "Cannot read properties of undefined (reading 'color')".
   *
   * - `hour` lebih besar dari semua tier -> fallback ke tier tertinggi
   * - tabel kosong / bukan array -> fallback ke object kosong
   */
  getSolutionTime(hour: number): any {
    const tiers = (Array.isArray(this.ticketSolutionTime)
      ? this.ticketSolutionTime
      : []
    )
      .filter((item: any) => Number.isFinite(Number(item?.duration)))
      .sort((a: any, b: any) => Number(a.duration) - Number(b.duration));

    if (tiers.length === 0) {
      return {};
    }

    return (
      tiers.find((item: any) => Number(hour) <= Number(item.duration)) ??
      tiers[tiers.length - 1]
    );
  }


  removeHtmlTags(htmlString: string): string {
  if (!htmlString) return '';
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  return doc.body.textContent || '';
}

  private getWeekendHours(start: Date, end: Date): number {
    let total = 0;
    let cursor = new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate(),
    );

    while (cursor < end) {
      const next = new Date(
        cursor.getFullYear(),
        cursor.getMonth(),
        cursor.getDate() + 1,
      );
      const day = cursor.getDay(); // 0 = Minggu, 6 = Sabtu

      if (day === 0 || day === 6) {
        const from = Math.max(cursor.getTime(), start.getTime());
        const to = Math.min(next.getTime(), end.getTime());
        if (to > from) {
          total += (to - from) / (1000 * 60 * 60);
        }
      }
      cursor = next;
    }

    return total;
  }

  projectId: string = '';
  taskCount: number = 100;
  ticketBased: number = 0;
  responseDateTime : string = '';
  targetCompletationDateTime : string = '';
  lockTime : number = 1;
  verificationDateTime : string = '';
  actualWorkingHour : number = 0;
  loadTaskDetail(): void {
    this.loading = true;
    this.errorMessage = '';

    this.apiService.get(`/cases/${this.taskId}`).subscribe({
      next: (response) => {
        this.ticketStatusName = response?.data?.ticketStatusName || '';
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
        console.log('data', response.data);
        this.addHour = response.data.addHour;
       
        this.responseDateTime = String(response.data.responseDateTime ?? '');
        this.targetCompletationDateTime = String(
          response.data.targetCompletationDateTime ?? '',
        );
        this.lockTime = Number(response.data.lockTime ?? 0);

        // Isi form dari DB hanya kalau case sudah pernah di-submit (lockTime = 1).
        // Kalau belum (lockTime = 0) biarkan default "sekarang" supaya user yang memilih.
        if (this.lockTime === 1) {
          this.applyDateTimeFromTask();
        }

        this.ticketSolutionTime = Array.isArray(response.data.ticketSolutionTime)
          ? response.data.ticketSolutionTime
          : [];
        this.onSubmitDateChange();

        if( this.lockTime === 0) {
            this.formMode = 'edit';
        }

        this.verificationDateTime = String(response.data.verificationDateTime ?? '');
        this.actualWorkingHour = Number(response.data.actualWorkingHour ?? 0).toFixed(2) as unknown as number;
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
  ticketBalance: number = 0;
  async loadOptions(): Promise<void> {
    this.loadingOptions = true;

    try {
      const [
        projectResponse,
        ticketStatusResponse,
        ticketSeverityResponse,
        ticketCategoriesResponse,
      ] = await Promise.all([
        firstValueFrom(
          this.apiService.get(`/project/detail/${this.projectId}`),
        ),

        firstValueFrom(
          this.apiService.get('/master/status/cases', { presence: 1 }),
        ),

        firstValueFrom(
          this.apiService.get('/master/ticketSeverity', { presence: 1 }),
        ),
        firstValueFrom(
          this.apiService.get('/ticket-categories', {
            presence: 1,
            status: 1,
            parentId: this.task?.ticketCategoriesParentId,
          }),
        ),
      ]);
      this.ticketStatusOptions = Array.isArray(ticketStatusResponse?.data)
        ? ticketStatusResponse.data
        : [];

      this.projects = projectResponse.data;
      this.ticketBalance = Number(
        projectResponse.data?.ticketBalance?.balance || 0,
      );

      this.internalUsers = projectResponse.data?.users || [];

      this.ticketSeverities = Array.isArray(ticketSeverityResponse?.data)
        ? ticketSeverityResponse.data
        : [];

      this.ticketCategoryOptions = Array.isArray(ticketCategoriesResponse?.data)
        ? ticketCategoriesResponse.data
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
    if (!this.task || !this.canUpdate) {
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
    //  console.log('selected value:', value);
    // console.log('dari ngModel:', this.formModel.ticketStatusId);
  }

  getHours() {
    // buatkan function get Id dari ticketSeverities, lalu ambil value hours dari severityId
    const severity = this.ticketSeverities.find(
      (s: any) => s.id === this.formModel.ticketSeverityId,
    );

    const newDate = new Date(this.formModel.submitDate);
    newDate.setTime(newDate.getTime() + this.addHour * 60 * 60 * 1000);

    // kalau mau balik ke format string yang sama ('YYYY-MM-DDTHH:mm')
    const pad = (n: number) => n.toString().padStart(2, '0');
    this.formModel.targetCompletionDate = `${newDate.getFullYear()}-${pad(newDate.getMonth() + 1)}-${pad(newDate.getDate())}T${pad(newDate.getHours())}:${pad(newDate.getMinutes())}`;

    // this.calculateCurDateTime();
    console.log(this.formModel.targetCompletionDate);
  }

  saveCase() {
    if (!this.canUpdate) {
      return;
    }

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
  // addHour dideklarasikan di bagian atas (default 3) dan dipakai bersama oleh
  // responseTime / targetCompletationTime serta perhitungan deadline di bawah.
  updateTask(): void {
    
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
      ticketEstimationCost:
        this.formModel.ticketEstimationCost < 0
          ? 0
          : this.formModel.ticketEstimationCost,
      ticketCategoryId: Number(this.formModel.ticketCategoryId),
      hours:
        Number(this.formModel.ticketEstimationCost) *
        Number(this.projects.ticketBaseHours || 0),
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
        this.socketNotificationService.emitReloadAction();
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
    if (this.deleting || !this.taskId || !this.canDelete) {
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
      ticketCategoryId: 0,
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
      ticketEstimationCost: Number(this.task?.ticketEstimationCost ?? 0),
      ticketCategoryId: Number(this.task?.ticketCategoryId ?? 0),
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

  /** Menambah sejumlah jam ke sebuah tanggal. */
  private offsetDate(date: Date, hours: number): Date {
    return new Date(date.getTime() + hours * 60 * 60 * 1000);
  }

  /**
   * Tanggal hari ini dalam format NgbDateStruct (dipakai ngbDatepicker).
   */
  private currentDateStruct(date: Date = new Date()): NgbDateStruct {
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
    };
  }

  /**
   * Jam hari ini yang sedang berjalan dalam format HH:mm (dipakai <input type="time">).
   */
  private currentTimeValue(date: Date = new Date()): string {
    const hour = String(date.getHours()).padStart(2, '0');
    const minute = String(date.getMinutes()).padStart(2, '0');
    return `${hour}:${minute}`;
  }

  /**
   * Set ulang response & target completion:
   * responseTime = jam sekarang, targetCompletationTime = jam sekarang + addHour jam.
   */
  // setResponseNow(): void {
  //   const now = new Date();

  //   this.responseDate = this.currentDateStruct(now);
  //   this.responseTime = this.currentTimeValue(now);
  //   this.targetCompletationDate = this.currentDateStruct(now);
  //   this.targetCompletationTime = this.currentTimeValue(
  //     this.offsetDate(now, this.addHour),
  //   );
  // }

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

  /**
   * Mengubah NgbDateStruct + jam ("HH:mm") menjadi objek Date waktu lokal.
   * Dipakai untuk menghitung selisih jam tanpa bergantung pada parsing
   * string (yang hasilnya bisa berbeda antar browser).
   */
  private toLocalDateTime(
    value: NgbDateStruct | null,
    timeValue: string,
  ): Date | null {
    if (!value?.year || !value?.month || !value?.day) {
      return null;
    }

    const normalizedTime = String(timeValue || '').trim();

    if (!normalizedTime) {
      return null;
    }

    const [hour = '0', minute = '0'] = normalizedTime.split(':');
    const date = new Date(
      Number(value.year),
      Number(value.month) - 1,
      Number(value.day),
      Number(hour) || 0,
      Number(minute) || 0,
      0,
      0,
    );

    return Number.isNaN(date.getTime()) ? null : date;
  }

  /**
   * Memecah string datetime MySQL ("2026-10-06 21:28:00") menjadi
   * NgbDateStruct (untuk ngbDatepicker) + jam "HH:mm" (untuk <input type="time">).
   *
   * Mengembalikan null kalau formatnya tidak dikenali, mis. string kosong
   * atau tanggal tidak valid (31 Feb yang di-rollover diam-diam oleh JS).
   */
  private splitSqlDateTime(value: unknown): {
    date: NgbDateStruct;
    time: string;
  } | null {
    const match = String(value ?? '')
      .trim()
      .match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);

    if (!match) {
      return null;
    }

    const [, year, month, day, hour, minute] = match;

    const parsed = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      0,
      0,
    );

    // new Date() melakukan rollover (31 Feb -> 3 Mar), jadi komponennya
    // dicocokkan ulang agar tanggal tidak valid tidak ikut terisi.
    const isSameComponents =
      parsed.getFullYear() === Number(year) &&
      parsed.getMonth() === Number(month) - 1 &&
      parsed.getDate() === Number(day);

    if (!isSameComponents) {
      return null;
    }

    return {
      date: {
        year: Number(year),
        month: Number(month),
        day: Number(day),
      },
      time: `${hour}:${minute}`,
    };
  }

  /**
   * Mengisi Response & Target Completion dari string datetime yang tersimpan di DB,
   * supaya form tampilannya sesuai data yang sudah pernah di-submit.
   * Nilai lama dipertahankan bila string-nya kosong / tidak valid.
   */
  private applyDateTimeFromTask(): void {
    const response = this.splitSqlDateTime(this.responseDateTime);

    if (response) {
      this.responseDate = response.date;
      this.responseTime = response.time;
    }

    const target = this.splitSqlDateTime(this.targetCompletationDateTime);

    if (target) {
      this.targetCompletationDate = target.date;
      this.targetCompletationTime = target.time;
    }
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

  submitInProgress(){
 
    const payload = {
        responseDateTime :  this.toSqlDateTime(this.responseDate, this.responseTime),
        targetCompletationDateTime :this.toSqlDateTime(
        this.targetCompletationDate,
        this.targetCompletationTime,
      ),
        ticketSolutionTimeId : this.solution['id'],
        responseHour : this.addHour,
        assignTo: this.formModel.assignTo,

    }
    console.log(payload);


     this.apiService.put(`/cases/${this.taskId}/submitInProgress`, payload).subscribe({
      next: (response) => {
        this.saving = false;
        this.message = response?.message || 'Case updated.';
        this.formMode = 'view';
        this.loadTaskDetail();
        this.loadTaskDetailLog();
        this.socketNotificationService.emitReloadAction();
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage = error?.error?.message || 'Failed to update case.';
      },
    });

  }
  
  submitVerification(){
    if(confirm(`Are you sure to submit case ${this.taskId} for verification?`)){
      const payload = { 
        assignTo : this.formModel.assignTo,
        updateBy: this.formModel.submitBy,
        taskSolution: this.formModel.taskSolution.trim(),
      }
      console.log(payload);
      this.apiService.put(`/cases/${this.taskId}/submitVerification`, payload).subscribe({
        next: (response) => {
          this.saving = false;
          this.message = response?.message || 'Case submitted for verification.';
          this.formMode = 'view';
          this.loadTaskDetail();
          this.loadTaskDetailLog();
          this.socketNotificationService.emitReloadAction();
        },
        error: (error) => {
          this.saving = false;
          this.errorMessage = error?.error?.message || 'Failed to submit case for verification.';
          alert(this.errorMessage);
        },
      });
    }
  }
}

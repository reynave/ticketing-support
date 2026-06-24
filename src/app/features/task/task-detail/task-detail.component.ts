import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Editor, NgxEditorModule, Toolbar } from 'ngx-editor';

import { ApiService } from '../../../core/services/api.service';
import {
  ModalDismissReasons,
  NgbDatepickerModule,
  NgbModal,
} from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxEditorModule, NgbDatepickerModule],
  templateUrl: './task-detail.component.html',
  styleUrl: './task-detail.component.css',
})
export class TaskDetailComponent implements OnInit, OnDestroy {
   // Listens for Ctrl + S globally on the document
  @HostListener('document:keydown.control.s', ['$event'])
  onKeydownHandler(event: KeyboardEvent) {
    event.preventDefault(); // Stops the browser's default Save Page dialog
    console.log('Ctrl + S pressed');
    this.saveTask();        // Calls your custom function
  }
  
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly apiService = inject(ApiService);

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
  readonly taskTypeId = 1;
  ticketStatusOptions: any = [];

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
  taskLogs: any = [];
  formModel: any = this.defaultForm();

  ngOnInit(): void {
    this.editor1 = new Editor();
    this.editor2 = new Editor();
    this.editor3 = new Editor();
    this.taskId = String(this.route.snapshot.paramMap.get('id') || '').trim();

    if (!this.taskId) {
      void this.router.navigate(['/tasks']);
      return;
    }

    this.loadOptions();
    this.loadTaskDetail();
    this.loadTaskDetailLog();
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
  loadTaskDetailLog(): void {
    this.loading = true;
    this.errorMessage = '';

    this.apiService.get(`/ticket/${this.taskId}/logs`).subscribe({
      next: (response) => {
        this.loading = false;
        this.taskLogs = response?.data || [];
      },
      error: (error) => {
        this.loading = false;
        this.task = null;
        this.errorMessage =
          error?.error?.message || 'Failed to load task detail.';
      },
    });
  }
  private modalService = inject(NgbModal);
  logId : number = 0;

  replayLog :any ={
    id : 0,
    description : '',
  }
  open(content: any, log : any = []): void {
    if(log.id != 0){
this.replayLog.id = log.id;
    this.replayLog.description = log.description;
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
      const [projectResponse, internalUserResponse, ticketStatusResponse] =
        await Promise.all([
          firstValueFrom(this.apiService.get('/project', { status: 1 })),
          firstValueFrom(
            this.apiService.get('/user', { userTypeId: 1, status: 1 }),
          ),
          firstValueFrom(
            this.apiService.get('/master/ticketStatus', { presence: 1 }),
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
    } catch {
      this.projects = [];
      this.internalUsers = [];
      this.ticketStatusOptions = [];
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

  saveTask(): void {
    
    // if (form.invalid || this.saving) {
    //   return;
    // }

    const targetCompletionDate = this.formModel.targetCompletionDate['year'] +
      '-' +
      String(this.formModel.targetCompletionDate['month']).padStart(2, '0') +
      '-' +
      String(this.formModel.targetCompletionDate['day']+1).padStart(2, '0');
    
  
    const actualCompletionDate = this.formModel.actualCompletionDate['year'] +
      '-' +
      String(this.formModel.actualCompletionDate['month']).padStart(2, '0') +
      '-' +
      String(this.formModel.actualCompletionDate['day']+1).padStart(2, '0');

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
        history.back();
      },
      error: (error) => {
        this.deleting = false;
        this.errorMessage = error?.error?.message || 'Failed to delete task.';
      },
    });
  }

  descriptionLog: string = '';
  submitActivity() {
    const payload = {
      ticketId: this.taskId,
      description: this.descriptionLog.trim(),
      submitBy: this.formModel.submitBy,
      parentId : this.replayLog.id,
    };
    console.log('submitActivity payload', payload);

    this.saving = true;
    this.message = '';
    this.errorMessage = '';

    this.apiService.post(`/ticket/log/${this.taskId}`, payload).subscribe({
      next: (response) => {
        this.saving = false;
        this.descriptionLog = '';
        this.message = response?.message || 'Activity submitted.';
        this.formMode = 'view';
        this.modalService.dismissAll();
        this.loadTaskDetailLog();
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage =
          error?.error?.message || 'Failed to submit activity.';
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
    let [yyyy, mm, dd] = this.task?.targetCompletionDate.split('T')[0].split('-') || []; 
    const targetCompletionDate =  {year: Number(yyyy), month: Number(mm), day: Number(dd)};

    [yyyy, mm, dd] = this.task?.actualCompletionDate.split('T')[0].split('-') || []; 
    const actualCompletionDate =  {year: Number(yyyy), month: Number(mm), day: Number(dd)};


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
}

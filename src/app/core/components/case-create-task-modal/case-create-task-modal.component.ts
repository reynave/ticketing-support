import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  Output,
  TemplateRef,
  ViewChild,
  inject,
} from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import {
  NgbDatepickerModule,
  NgbModal,
  NgbModalModule,
  NgbModalRef,
} from '@ng-bootstrap/ng-bootstrap';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-case-create-task-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbModalModule, NgbDatepickerModule],
  templateUrl: './case-create-task-modal.component.html',
})
export class CaseCreateTaskModalComponent {
  private readonly apiService = inject(ApiService);
  private readonly modalService = inject(NgbModal);

  @ViewChild('createTaskModal') createTaskModal?: TemplateRef<unknown>;

  @Input() crId = '';
  @Input() caseId = '';
  @Input() projectId = '';
  @Input() modules: any[] = [];
  @Input() assignTo: number | string = 0;
  @Input() submitBy: number | string = 0;
  @Input() ticketCategories: any[] = [];
  @Input() internalUsers: any[] = [];
  @Input() loadingOptions = false;
  @Input() buttonLabel = 'New Task';
  @Input() ticketCategoryId = '';
  @Input() productChildId = '';
  @Input() title = '';
  @Output() created = new EventEmitter<void>();
  @Output() failed = new EventEmitter<string>();
  @Input() origin = '';
  @Input() targetCompletionDate = {};
  @Input() targetCompletionTime = '';
  private modalRef: NgbModalRef | null = null;

  savingRelatedTask = false;
  relatedTaskForm: any = this.defaultRelatedTaskForm();

  openCreateTaskModal(): void {
    if (!this.createTaskModal) {
      return;
    }
    this.relatedTaskForm = this.defaultRelatedTaskForm(); 
    this.relatedTaskForm.projectId = String(this.projectId || '');
    this.relatedTaskForm.assignTo =
      Number(this.assignTo || 0) > 0 ? Number(this.assignTo) : null;
    this.relatedTaskForm.caseId = String(this.caseId || '');
    this.relatedTaskForm.title = this.title;
    this.relatedTaskForm.description = `Follow up from case ${this.caseId}`;
    this.relatedTaskForm.origin = this.origin;

    const target = this.parseTargetCompletion();
    if (target.date) {
      this.relatedTaskForm.targetCompletionDate = target.date;
    }
    this.relatedTaskForm.targetCompletionTime = target.time;

    this.modalRef = this.modalService.open(this.createTaskModal, {
      size: 'lg',
      centered: true,
    });
  }

  saveRelatedTask(form: NgForm): void {
    if (form.invalid || this.savingRelatedTask) {
      return;
    }
    // new Date() get hour:minute:second
    const now = new Date();
    const currentHour = String(now.getHours()).padStart(2, '0');
    const currentMinute = String(now.getMinutes()).padStart(2, '0');
    const currentSecond = String(now.getSeconds()).padStart(2, '0');
    const currentTime = `${currentHour}:${currentMinute}:${currentSecond}`;

    const payload = {
      ticketTypeId: 1,
      caseId: this.relatedTaskForm.caseId,
      title: String(this.relatedTaskForm.title || '').trim(),
      description: String(this.relatedTaskForm.description || '').trim(),
      projectId: this.relatedTaskForm.projectId,
      submitBy: this.submitBy,
      submitDate: this.toApiDate(this.relatedTaskForm.submitDate)+' '+currentTime,
      targetCompletionDate: this.toApiDateTime(
        this.relatedTaskForm.targetCompletionDate,
        this.relatedTaskForm.targetCompletionTime,
      ),
      assignTo: this.relatedTaskForm.assignTo,
      taskSolution: '',
      ticketStatusId: Number(this.relatedTaskForm.ticketStatusId || 100),
      ticketCategoryId: Number(this.relatedTaskForm.ticketCategoryId || 0),
      productChildId : Number(this.relatedTaskForm.productChildId || 0),
    };

    console.log('Payload for creating related task:', payload);
    this.savingRelatedTask = true;

   

    let controller  = 'cases';
    if(this.origin === 'Change Requests'){
      controller = 'change-requests';
    }

    this.apiService.post(`/${controller}/${this.caseId}/tasks`, payload).subscribe({
      next: () => {
        this.savingRelatedTask = false;
        this.modalRef?.close();
        this.modalRef = null;
        this.created.emit();
      },
      error: (error) => {
        this.savingRelatedTask = false;
        this.failed.emit(
          error?.error?.message || 'Failed to create related task.',
        );
      },
    });
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
      targetCompletionTime: this.currentTime(),
      assignTo: null,
      ticketStatusId: 1,
      ticketCategoryId: this.ticketCategoryId,
      productChildId : this.productChildId,
    };
  }

  private toApiDate(dateModel: any): string {
    if (!dateModel || !dateModel.year || !dateModel.month || !dateModel.day) {
      return '';
    }

    return `${dateModel.year}-${String(dateModel.month).padStart(2, '0')}-${String(dateModel.day).padStart(2, '0')}`;
  }

  private toApiDateTime(dateModel: any, timeValue: string): string {
    const date = this.toApiDate(dateModel);
    if (!date) {
      return '';
    }

    const time = String(timeValue || '').trim() || '00:00';
    return `${date} ${time}:00`;
  }

  private currentTime(): string {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes(),
    ).padStart(2, '0')}`;
  }

  private parseTargetCompletion(): {
    date: { year: number; month: number; day: number } | null;
    time: string;
  } {
    let date: { year: number; month: number; day: number } | null = null;
    let time = String(this.targetCompletionTime || '').trim();

    const raw: any = this.targetCompletionDate;
    if (raw && typeof raw === 'object' && raw.year && raw.month && raw.day) {
      date = {
        year: Number(raw.year),
        month: Number(raw.month),
        day: Number(raw.day),
      };
    } else if (typeof raw === 'string' && raw.trim()) {
      const match = raw
        .trim()
        .match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?/);
      if (match) {
        date = {
          year: Number(match[1]),
          month: Number(match[2]),
          day: Number(match[3]),
        };
        if (match[4] && match[5] && !time) {
          time = `${String(match[4]).padStart(2, '0')}:${match[5]}`;
        }
      }
    }

    if (!time) {
      time = this.currentTime();
    }

    return { date, time };
  }
}

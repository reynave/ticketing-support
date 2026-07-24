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

  @Output() created = new EventEmitter<void>();
  @Output() failed = new EventEmitter<string>();

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
    this.relatedTaskForm.title = `Task of ${this.caseId}`;
    this.relatedTaskForm.description = `Follow up from case ${this.caseId}`;

    this.modalRef = this.modalService.open(this.createTaskModal, {
      size: 'lg',
      centered: true,
    });
  }

  saveRelatedTask(form: NgForm): void {
    if (form.invalid || this.savingRelatedTask) {
      return;
    }

    const payload = {
      ticketTypeId: 1,
      caseId: this.relatedTaskForm.caseId,
      title: String(this.relatedTaskForm.title || '').trim(),
      description: String(this.relatedTaskForm.description || '').trim(),
      projectId: this.relatedTaskForm.projectId,
      submitBy: this.submitBy,
      submitDate: this.toApiDate(this.relatedTaskForm.submitDate),
      targetCompletionDate: this.toApiDate(
        this.relatedTaskForm.targetCompletionDate,
      ),
      assignTo: this.relatedTaskForm.assignTo,
      taskSolution: '',
      ticketStatusId: Number(this.relatedTaskForm.ticketStatusId || 100),
      ticketCategoryId: Number(this.relatedTaskForm.ticketCategoryId || 0),
      productChildId : Number(this.relatedTaskForm.productChildId || 0),
    };

    this.savingRelatedTask = true;

    this.apiService.post(`/cases/${this.caseId}/tasks`, payload).subscribe({
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
      assignTo: null,
      ticketStatusId: 100,
      ticketCategoryId: null,
      productChildId : null,
    };
  }

  private toApiDate(dateModel: any): string {
    if (!dateModel || !dateModel.year || !dateModel.month || !dateModel.day) {
      return '';
    }

    return `${dateModel.year}-${String(dateModel.month).padStart(2, '0')}-${String(dateModel.day).padStart(2, '0')}`;
  }
}

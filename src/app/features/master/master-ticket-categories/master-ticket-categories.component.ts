import { CommonModule } from '@angular/common';
import { Component, TemplateRef, ViewChild, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgbModal, NgbModalModule, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';

interface TicketCategoryCreateForm {
  name: string;
  parentId: number;
  weight: number;
  status: number;
}

@Component({
  selector: 'app-master-ticket-categories',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgbModalModule],
  templateUrl: './master-ticket-categories.component.html',
  styleUrl: './master-ticket-categories.component.css',
})
export class MasterTicketCategoriesComponent {
  private readonly apiService = inject(ApiService);
  private readonly router = inject(Router);
  private readonly modalService = inject(NgbModal);

  @ViewChild('categoryFormModal') categoryFormModal?: TemplateRef<unknown>;
  private modalRef: NgbModalRef | null = null;

  rows: any[] = [];
  parentOptions: any[] = [];

  loading = false;
  loadingParents = false;
  saving = false;
  message = '';
  errorMessage = '';

  selectedStatus = '';
  selectedParentId = '';
  formMode: 'parent' | 'child' = 'parent';
  selectedParentForChild: any = null;
  formModel: TicketCategoryCreateForm = this.defaultForm();

  constructor() {
    void this.loadParentOptions();
    this.loadRows();
  }

  async loadParentOptions(): Promise<void> {
    this.loadingParents = true;

    try {
      const response = await firstValueFrom(this.apiService.get('/ticket-categories', { parentId: 0 }));
      this.parentOptions = Array.isArray(response?.data) ? response.data : [];
    } catch {
      this.parentOptions = [];
    } finally {
      this.loadingParents = false;
    }
  }

  loadRows(): void {
    this.loading = true;
    this.errorMessage = '';

    const query: Record<string, string | number> = {};

    if (this.selectedStatus !== '') {
      query['status'] = Number(this.selectedStatus);
    }

    if (this.selectedParentId !== '') {
      query['parentId'] = Number(this.selectedParentId);
    }

    this.apiService.get('/ticket-categories', query).subscribe({
      next: (response) => {
        this.loading = false;
        this.rows = Array.isArray(response?.data) ? response.data : [];
      },
      error: (error) => {
        this.loading = false;
        this.rows = [];
        this.errorMessage = error?.error?.message || 'Failed to load ticket categories.';
      },
    });
  }

  resetFilter(): void {
    this.selectedStatus = '';
    this.selectedParentId = '';
    this.loadRows();
  }

  openNewParentModal(): void {
    if (!this.categoryFormModal) {
      return;
    }

    this.formMode = 'parent';
    this.selectedParentForChild = null;
    this.formModel = this.defaultForm();
    this.message = '';
    this.errorMessage = '';

    this.modalRef = this.modalService.open(this.categoryFormModal, {
      centered: true,
      backdrop: 'static',
    });
  }

  openNewChildModal(parentRow: any): void {
    if (!this.categoryFormModal || !this.isParentRow(parentRow)) {
      return;
    }

    this.formMode = 'child';
    this.selectedParentForChild = parentRow;
    this.formModel = {
      ...this.defaultForm(),
      parentId: Number(parentRow.id),
    };
    this.message = '';
    this.errorMessage = '';

    this.modalRef = this.modalService.open(this.categoryFormModal, {
      centered: true,
      backdrop: 'static',
    });
  }

  closeModal(): void {
    this.modalRef?.close();
    this.modalRef = null;
  }

  saveCategory(form: NgForm): void {
    if (form.invalid || this.saving) {
      return;
    }

    const payload = {
      name: this.formModel.name.trim(),
      parentId: Number(this.formModel.parentId),
      weight: Number(this.formModel.weight),
      status: Number(this.formModel.status),
    };

    this.saving = true;
    this.errorMessage = '';

    this.apiService.post('/ticket-categories', payload).subscribe({
      next: (response) => {
        this.saving = false;
        this.closeModal();
        this.message = response?.message || 'Category created.';
        void this.loadParentOptions();
        this.loadRows();
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage = error?.error?.message || 'Failed to create category.';
      },
    });
  }

  getParentName(row: any): string {
    const parentId = Number(row?.parentId || 0);

    if (!parentId) {
      return 'Root';
    }

    const parent = this.parentOptions.find((item) => Number(item?.id) === parentId);
    return parent?.name || String(parentId);
  }

  goToDetail(row: any): void {
    const id = Number(row?.id || 0);

    if (!id) {
      return;
    }

    void this.router.navigate(['/master-ticket-categories', id]);
  }

  isParentRow(row: any): boolean {
    return Number(row?.parentId || 0) === 0;
  }

  trackById(_: number, row: any): any {
    return row?.id;
  }

  private defaultForm(): TicketCategoryCreateForm {
    return {
      name: '',
      parentId: 0,
      weight: 0,
      status: 1,
    };
  }
}
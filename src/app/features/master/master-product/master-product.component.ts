import { CommonModule } from '@angular/common';
import { Component, TemplateRef, ViewChild, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgbModal, NgbModalModule, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';

interface ProductCreateForm {
  name: string;
  parentId: number;
  status: number;
}

@Component({
  selector: 'app-master-product',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgbModalModule],
  templateUrl: './master-product.component.html',
  styleUrl: './master-product.component.css',
})
export class MasterProductComponent {
  private readonly apiService = inject(ApiService);
  private readonly router = inject(Router);
  private readonly modalService = inject(NgbModal);

  @ViewChild('productFormModal') productFormModal?: TemplateRef<unknown>;
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
  formModel: ProductCreateForm = this.defaultForm();

  constructor() {
    void this.loadParentOptions();
    this.loadRows();
  }

  async loadParentOptions(): Promise<void> {
    this.loadingParents = true;

    try {
      const response = await firstValueFrom(this.apiService.get('/product-master', { parentId: 0 }));
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

    this.apiService.get('/product-master', query).subscribe({
      next: (response) => {
        this.loading = false;
        const rows = Array.isArray(response?.data) ? response.data : [];
        this.rows = this.buildTree(rows);
      },
      error: (error) => {
        this.loading = false;
        this.rows = [];
        this.errorMessage = error?.error?.message || 'Failed to load product master data.';
      },
    });
  }

  resetFilter(): void {
    this.selectedStatus = '';
    this.selectedParentId = '';
    this.loadRows();
  }

  openNewParentModal(): void {
    if (!this.productFormModal) {
      return;
    }

    this.formMode = 'parent';
    this.selectedParentForChild = null;
    this.formModel = this.defaultForm();
    this.message = '';
    this.errorMessage = '';

    this.modalRef = this.modalService.open(this.productFormModal, {
      centered: true,
      backdrop: 'static',
    });
  }

  openNewChildModal(parentRow: any): void {
    if (!this.productFormModal || !this.isParentRow(parentRow)) {
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

    this.modalRef = this.modalService.open(this.productFormModal, {
      centered: true,
      backdrop: 'static',
    });
  }

  closeModal(): void {
    this.modalRef?.close();
    this.modalRef = null;
  }

  saveProduct(form: NgForm): void {
    if (form.invalid || this.saving) {
      return;
    }

    const payload = {
      name: this.formModel.name.trim(),
      parentId: Number(this.formModel.parentId),
      status: Number(this.formModel.status),
    };

    this.saving = true;
    this.errorMessage = '';

    this.apiService.post('/product-master', payload).subscribe({
      next: (response) => {
        this.saving = false;
        this.closeModal();
        this.message = response?.message || 'Product created.';
        void this.loadParentOptions();
        this.loadRows();
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage = error?.error?.message || 'Failed to create product.';
      },
    });
  }

  getParentName(row: any): string {
    const parentId = Number(row?.parentId || 0);

    if (!parentId) {
      return '';
    }

    const parent = this.parentOptions.find((item) => Number(item?.id) === parentId);
    return parent?.name || String(parentId);
  }

  goToDetail(row: any): void {
    const id = Number(row?.id || 0);

    if (!id) {
      return;
    }

    void this.router.navigate(['/master-product', id]);
  }

  isParentRow(row: any): boolean {
    return Number(row?.parentId || 0) === 0;
  }

  trackById(_: number, row: any): any {
    return row?.id;
  }

  private buildTree(rows: any[]): any[] {
    const parents = rows.filter((row) => Number(row?.parentId || 0) === 0).map((row) => ({ ...row, children: [] as any[] }));
    const parentMap = new Map<number, any>();

    for (const parent of parents) {
      parentMap.set(Number(parent.id), parent);
    }

    for (const row of rows) {
      if (Number(row?.parentId || 0) === 0) {
        continue;
      }

      const parent = parentMap.get(Number(row.parentId));
      if (parent) {
        parent.children.push(row);
      }
    }

    return parents;
  }

  private defaultForm(): ProductCreateForm {
    return {
      name: '',
      parentId: 0,
      status: 1,
    };
  }
}

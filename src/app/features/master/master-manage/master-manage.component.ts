import { CommonModule } from '@angular/common';
import { Component, OnInit, TemplateRef, ViewChild, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgbModal, NgbModalModule, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ApiService } from '../../../core/services/api.service';

interface MasterFieldConfig {
  key: string;
  label: string;
  type: 'text' | 'number' | 'textarea';
  required?: boolean;
}

interface MasterConfig {
  label: string;
  fields: MasterFieldConfig[];
  hasStatusFilter: boolean;
  updateOnly?: boolean;
}

interface CellDisplay {
  text: string;
  iconClass?: string;
  badgeClass?: string;
}

@Component({
  selector: 'app-master-manage',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgbModalModule],
  templateUrl: './master-manage.component.html',
  styleUrl: './master-manage.component.css',
})
export class MasterManageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly apiService = inject(ApiService);
  private readonly modalService = inject(NgbModal);
   private readonly router = inject(Router);
  

  @ViewChild('masterFormModal') masterFormModal?: TemplateRef<unknown>;
  private modalRef: NgbModalRef | null = null;

  readonly masterConfigs: Record<string, MasterConfig> = {
    industry: {
      label: 'Industry',
      fields: [{ key: 'name', label: 'Name', type: 'text', required: true }],
      hasStatusFilter: false,
    },
    product: {
      label: 'Product',
      fields: [
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'status', label: 'Status', type: 'number' },
      ],
      hasStatusFilter: true,
    },
    'project-type': {
      label: 'Project Type',
      fields: [
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'ticketBased', label: 'Ticket Based', type: 'number' },
        { key: 'status', label: 'Status', type: 'number' },
      ],
      hasStatusFilter: true,
    },
    'project-billeable': {
      label: 'Project Billeable',
      fields: [
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'status', label: 'Status', type: 'number' },
      ],
      hasStatusFilter: true,
    },
    'project-categories': {
      label: 'Project Categories',
      fields: [
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'status', label: 'Status', type: 'number' },
      ],
      hasStatusFilter: true,
    },
    'user-auth-level': {
      label: 'User Auth Level',
      fields: [
        { key: 'name', label: 'Name', type: 'text', required: true }, 
        
      ],
      hasStatusFilter: false,
    },
    'user-type': {
      label: 'User Type',
      fields: [{ key: 'name', label: 'Name', type: 'text', required: true }],
      hasStatusFilter: false,
    },
    'global-setting': {
      label: 'Global Setting',
      fields: [
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'value', label: 'Value', type: 'text', required: true },
        { key: 'note', label: 'Note', type: 'textarea' },
      ],
      hasStatusFilter: false,
      updateOnly: true,
    },
    'ticket-categories': {
      label: 'Ticket Categories',
      fields: [
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'weight', label: 'Weight', type: 'number', required: true }, 
         { key: 'status', label: 'Status', type: 'number' },
      ],
      hasStatusFilter: false,
      updateOnly: true,
    },
  };

  masterKey = '';
  config: MasterConfig | null = null;
  rows: any[] = [];
  columns: string[] = [];

  loading = false;
  saving = false;
  deletingId: number | null = null;
  message = '';
  errorMessage = '';

  selectedStatus = '';
  isEditMode = false;
  editingId: number | null = null;
  formModel: any = {};

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const key = params.get('masterKey') || '';
      this.configureByKey(key);
    });
  }

  get isUpdateOnly(): boolean {
    return !!this.config?.updateOnly;
  }

  configureByKey(key: string): void {
    this.message = '';
    this.errorMessage = '';
    this.masterKey = key;
    this.config = this.masterConfigs[key] || null;

    if (!this.config) {
      this.rows = [];
      this.columns = [];
      this.dismissModal();
      return;
    }

    this.dismissModal();
    this.resetFormState();
    this.selectedStatus = '';
    this.loadList();
  }

  goBack(){
    history.back();
  }

  loadList(): void {
    if (!this.config) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const query: any = {};

    if (this.config.hasStatusFilter && this.selectedStatus !== '') {
      query.status = this.selectedStatus;
    }

    this.apiService.get(`/master/${this.masterKey}`, query).subscribe({
      next: (response) => {
        this.loading = false;
        this.rows = Array.isArray(response?.data) ? response.data : [];
        this.columns = this.pickColumns(this.rows);
      },
      error: (error) => {
        this.loading = false;
        this.rows = [];
        this.columns = [];
        this.errorMessage = error?.error?.message || 'Failed to load master data.';
      },
    });
  }

  onFilterStatusChange(): void {
    this.loadList();
  }

  openCreate(): void {
    if (!this.config || this.isUpdateOnly) {
      return;
    }

    this.isEditMode = false;
    this.editingId = null;
    this.message = '';
    this.errorMessage = '';
    this.formModel = this.buildDefaultFormModel();
    this.openFormModal();
  }

  openEdit(row: any): void {
    if (!row?.id || !this.config) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.message = '';

    this.apiService.get(`/master/${this.masterKey}/${row.id}`).subscribe({
      next: (response) => {
        this.loading = false;
        this.isEditMode = true;
        this.editingId = Number(row.id);
        this.formModel = this.buildFormModelFromDetail(response?.data || {});
        this.openFormModal();
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error?.error?.message || 'Failed to load data details.';
      },
    });
  }

  closeForm(): void {
    this.dismissModal();
    this.resetFormState();
  }

  save(form: NgForm): void {
    if (!this.config || form.invalid || this.saving) {
      return;
    }

    const payload = this.buildPayload(this.formModel);
    this.saving = true;
    this.errorMessage = '';
    this.message = '';

    const request$ = this.isEditMode && this.editingId
      ? this.apiService.put(`/master/${this.masterKey}/${this.editingId}`, payload)
      : this.apiService.post(`/master/${this.masterKey}`, payload);

    request$.subscribe({
      next: (response) => {
        this.saving = false;
        this.message = response?.message || 'Data saved successfully.';
        this.closeForm();
        this.loadList();
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage = error?.error?.message || 'Failed to save data.';
      },
    });
  }

  deleteRow(row: any): void {
    if (!row?.id || this.isUpdateOnly) {
      return;
    }

    const confirmed = confirm(`Delete data with id ${row.id}?`);

    if (!confirmed) {
      return;
    }

    this.deletingId = Number(row.id);
    this.errorMessage = '';
    this.message = '';

    this.apiService.delete(`/master/${this.masterKey}/${row.id}`).subscribe({
      next: (response) => {
        this.deletingId = null;
        this.message = response?.message || 'Data deleted successfully.';
        this.loadList();
      },
      error: (error) => {
        this.deletingId = null;
        this.errorMessage = error?.error?.message || 'Failed to delete data.';
      },
    });
  }

  trackByRow(_: number, row: any): any {
    return row?.id;
  }

  goToAccessRight(row : any){
    console.log(row);
    this.router.navigate(['user-access-right'],{ queryParams : {id:row.id}});
  }
  getColumnLabel(column: string): string {
    const key = String(column || '').toLowerCase();

    const labelMap: Record<string, string> = {
      id: 'ID',
  
      ticketbased: 'Ticket Based',
      inputdate: 'Input Date',
      updatedate: 'Update Date',
      inputby: 'Input By',
      updateby: 'Update By',
    };

    if (labelMap[key]) {
      return labelMap[key];
    }

    return key
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  getCellDisplay(column: string, value: any): CellDisplay {
    const key = String(column || '').toLowerCase();

    if (value === undefined || value === null || value === '') {
      return { text: '-' };
    }

    if (key === 'status') {
      const isActive = this.isTruthyValue(value);
      return {
        text: isActive ? 'Active' : 'Inactive',
        iconClass: isActive ? 'bi bi-check-circle-fill' : 'bi bi-x-circle-fill',
        badgeClass: isActive
          ? 'badge text-bg-success-subtle text-success-emphasis border border-success-subtle'
          : 'badge text-bg-danger-subtle text-danger-emphasis border border-danger-subtle',
      };
    }

    if (this.isBooleanColumn(key) || typeof value === 'boolean') {
      const enabled = this.isTruthyValue(value);
      return {
        text: enabled ? 'Yes' : 'No',
        iconClass: enabled ? 'bi bi-check-circle-fill' : 'bi bi-x-circle-fill',
        badgeClass: enabled
          ? 'badge text-bg-primary-subtle text-primary-emphasis border border-primary-subtle'
          : 'badge text-bg-danger-subtle text-danger-emphasis border border-danger-subtle',
      };
    }

    return { text: String(value) };
  }

  private pickColumns(rows: any[]): string[] {
    if (!rows.length) {
      const preferred = this.config?.fields.map((field) => field.key) || [];
      return ['id', ...preferred];
    }

    const preferredColumns = ['id', ...(this.config?.fields.map((field) => field.key) || [])];
    const keys = Object.keys(rows[0]);
    return keys.filter((key) => preferredColumns.includes(key));
  }

  private buildDefaultFormModel(): any {
    const model: any = {};
    const fields = this.config?.fields || [];

    fields.forEach((field) => {
      if (field.type === 'number') {
        model[field.key] = 0;
      } else {
        model[field.key] = '';
      }
    });

    return model;
  }

  private buildFormModelFromDetail(detail: any): any {
    const model: any = {};
    const fields = this.config?.fields || [];

    fields.forEach((field) => {
      model[field.key] = detail?.[field.key] ?? (field.type === 'number' ? 0 : '');
    });

    return model;
  }

  private buildPayload(model: any): any {
    const payload: any = {};
    const fields = this.config?.fields || [];

    fields.forEach((field) => {
      const value = model[field.key];

      if (value === undefined || value === null || value === '') {
        return;
      }

      if (field.type === 'number') {
        payload[field.key] = Number(value);
      } else {
        payload[field.key] = value;
      }
    });

    return payload;
  }

  private isBooleanColumn(column: string): boolean {
    return ['c', 'r', 'u', 'd', 'ticketbased', 'presence'].includes(column);
  }

  private isTruthyValue(value: any): boolean {
    if (typeof value === 'boolean') {
      return value;
    }

    const normalized = String(value).trim().toLowerCase();
    return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'active';
  }

  private openFormModal(): void {
    if (!this.masterFormModal) {
      return;
    }

    this.dismissModal();
    this.modalRef = this.modalService.open(this.masterFormModal, {
      size: 'lg',
      centered: true,
      backdrop: 'static',
      keyboard: false,
    });
  }

  private dismissModal(): void {
    if (!this.modalRef) {
      return;
    }

    this.modalRef.dismiss();
    this.modalRef = null;
  }

  private resetFormState(): void {
    this.formModel = {};
    this.isEditMode = false;
    this.editingId = null;
  }
}

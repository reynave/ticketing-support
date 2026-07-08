import { CommonModule } from '@angular/common';
import { Component, OnInit, TemplateRef, ViewChild, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgbModal, NgbModalModule, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ApiService } from '../../../core/services/api.service';
import { firstValueFrom } from 'rxjs';

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
    'user-access-right': {
      label: 'User Access Right',
      fields: [
        { key: 'authLevelId', label: 'Auth Level Id', type: 'number', required: true },
        { key: 'moduleId', label: 'Module Id', type: 'number', required: true },
        { key: 'c', label: 'Create', type: 'number' },
        { key: 'r', label: 'Read', type: 'number' },
        { key: 'u', label: 'Update', type: 'number' },
        { key: 'd', label: 'Delete', type: 'number' },
      ],
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
  selectedAuthLevelId: number | null = null;
  accessRightRows: any[] = [];
  savingAccessRight = false;
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

  get isAccessRightPage(): boolean {
    return this.masterKey === 'user-access-right';
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
    this.selectedAuthLevelId = this.parseSelectedAuthLevelId();

    if (this.isAccessRightPage) {
      this.loadAccessRightMatrix();
      return;
    }

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
        const dataRows = Array.isArray(response?.data) ? response.data : [];

        if (this.masterKey === 'user-access-right' && this.selectedAuthLevelId !== null) {
          this.rows = dataRows.filter((row: any) => Number(row?.authLevelId) === this.selectedAuthLevelId);
        } else {
          this.rows = dataRows;
        }

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
    if (this.isAccessRightPage) {
      this.loadAccessRightMatrix();
      return;
    }

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

    if (this.masterKey === 'user-access-right' && this.selectedAuthLevelId !== null) {
      this.formModel.authLevelId = this.selectedAuthLevelId;
    }

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
    if (this.masterKey !== 'user-auth-level') {
      return;
    }

    this.router.navigate(['/master/user-access-right'], { queryParams: { authLevelId: row.id } });
  }

  canShowCreateButton(): boolean {
    return !this.isUpdateOnly && !this.isAccessRightPage;
  }

  showAccessRightButton(): boolean {
    return this.masterKey === 'user-auth-level';
  }

  toChecked(value: any): boolean {
    return this.isTruthyValue(value);
  }

  onAccessRightToggle(row: any, key: 'c' | 'r' | 'u' | 'd', checked: boolean): void {
    row[key] = checked ? 1 : 0;
    row.__dirty = true;
  }

  isAccessRightAllChecked(key: 'c' | 'r' | 'u' | 'd'): boolean {
    if (!this.accessRightRows.length) {
      return false;
    }

    return this.accessRightRows.every((row) => this.toChecked(row[key]));
  }

  onAccessRightToggleAll(key: 'c' | 'r' | 'u' | 'd', checked: boolean): void {
    this.accessRightRows.forEach((row) => {
      const nextValue = checked ? 1 : 0;

      if (Number(row[key]) !== nextValue) {
        row[key] = nextValue;
        row.__dirty = true;
      }
    });
  }

  hasAccessRightChanges(): boolean {
    return this.accessRightRows.some((row) => row.__dirty === true);
  }

  async saveAccessRightChanges(): Promise<void> {
    if (!this.selectedAuthLevelId || this.savingAccessRight) {
      return;
    }

    const changedRows = this.accessRightRows.filter((row) => row.__dirty === true);

    if (!changedRows.length) {
      this.message = 'No changes to save.';
      this.errorMessage = '';
      return;
    }

    this.savingAccessRight = true;
    this.message = '';
    this.errorMessage = '';

    try {
      for (const row of changedRows) {
        const payload = {
          authLevelId: Number(this.selectedAuthLevelId),
          moduleId: Number(row.moduleId),
          c: Number(row.c),
          r: Number(row.r),
          u: Number(row.u),
          d: Number(row.d),
        };

        if (row.id) {
          await firstValueFrom(this.apiService.put(`/master/user-access-right/${row.id}`, payload));
        } else {
          await firstValueFrom(this.apiService.post('/master/user-access-right', payload));
        }
      }

      this.message = 'Access right updated successfully.';
      this.loadAccessRightMatrix();
    } catch (error: any) {
      this.errorMessage = error?.error?.message || 'Failed to update access right.';
    } finally {
      this.savingAccessRight = false;
    }
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

    if (this.masterKey === 'user-access-right' && this.selectedAuthLevelId !== null) {
      model.authLevelId = this.selectedAuthLevelId;
    }

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

  private loadAccessRightMatrix(): void {
    if (!this.selectedAuthLevelId) {
      this.rows = [];
      this.columns = [];
      this.accessRightRows = [];
      this.errorMessage = 'authLevelId is required. Please open from User Auth Level page.';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.apiService.get('/master/module').subscribe({
      next: (moduleResponse) => {
        const modules = Array.isArray(moduleResponse?.data) ? moduleResponse.data : [];
        const query: any = { authLevelId: this.selectedAuthLevelId };

        this.apiService.get('/master/user-access-right', query).subscribe({
          next: (rightResponse) => {
            this.loading = false;
            const rights = Array.isArray(rightResponse?.data) ? rightResponse.data : [];
            const rightMap = new Map<number, any>();

            rights.forEach((row: any) => {
              const moduleId = Number(row?.moduleId);

              if (!rightMap.has(moduleId)) {
                rightMap.set(moduleId, row);
              }
            });

            this.accessRightRows = modules.map((moduleRow: any) => {
              const moduleId = Number(moduleRow?.id);
              const right = rightMap.get(moduleId);

              return {
                id: Number(right?.id || 0),
                moduleId,
                moduleName: String(moduleRow?.name || `Module ${moduleId}`),
                c: Number(right?.c ?? 0),
                r: Number(right?.r ?? 0),
                u: Number(right?.u ?? 0),
                d: Number(right?.d ?? 0),
                __dirty: false,
              };
            });
          },
          error: (error) => {
            this.loading = false;
            this.accessRightRows = [];
            this.errorMessage = error?.error?.message || 'Failed to load access right data.';
          },
        });
      },
      error: (error) => {
        this.loading = false;
        this.accessRightRows = [];
        this.errorMessage = error?.error?.message || 'Failed to load module data.';
      },
    });
  }

  private parseSelectedAuthLevelId(): number | null {
    if (this.masterKey !== 'user-access-right') {
      return null;
    }

    const rawValue = this.route.snapshot.queryParamMap.get('authLevelId');
    const authLevelId = Number(rawValue);

    if (!rawValue || !Number.isInteger(authLevelId) || authLevelId <= 0) {
      return null;
    }

    return authLevelId;
  }
}

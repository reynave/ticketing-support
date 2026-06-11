import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';

interface UserFormModel {
  email: string;
  password: string;
  authlevelId: number;
  firstName: string;
  lastName: string;
  userTypeId: number;
  clientId: number;
  status: number;
}

@Component({
  selector: 'app-user-manage',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-manage.component.html',
  styleUrl: './user-manage.component.css',
})
export class UserManageComponent implements OnInit {
  private readonly apiService = inject(ApiService);

  rows: any[] = [];
  loading = false;
  saving = false;
  deletingId: string | null = null;
  message = '';
  errorMessage = '';

  selectedUserTypeFilter = '';
  selectedStatusFilter = '';

  isEditMode = false;
  editingId: string | null = null;
  formModel: UserFormModel = this.defaultForm();

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.errorMessage = '';

    const query: Record<string, string | number> = {};

    if (this.selectedUserTypeFilter !== '') {
      query['userTypeId'] = Number(this.selectedUserTypeFilter);
    }

    if (this.selectedStatusFilter !== '') {
      query['status'] = Number(this.selectedStatusFilter);
    }

    this.apiService.get('/user', query).subscribe({
      next: (response) => {
        this.loading = false;
        this.rows = Array.isArray(response?.data) ? response.data : [];
      },
      error: (error) => {
        this.loading = false;
        this.rows = [];
        this.errorMessage = error?.error?.message || 'Failed to load users.';
      },
    });
  }

  openCreate(): void {
    this.isEditMode = false;
    this.editingId = null;
    this.formModel = this.defaultForm();
    this.message = '';
    this.errorMessage = '';
  }

  openEdit(row: any): void {
    this.isEditMode = true;
    this.editingId = String(row?.id || '');
    this.formModel = {
      email: String(row?.email || ''),
      password: '',
      authlevelId: Number(row?.authlevelId ?? 1),
      firstName: String(row?.firstName || ''),
      lastName: String(row?.lastName || ''),
      userTypeId: Number(row?.userTypeId ?? 1),
      clientId: Number(row?.clientId ?? 0),
      status: Number(row?.status ?? 1),
    };
    this.message = '';
    this.errorMessage = '';
  }

  onUserTypeChange(): void {
    if (Number(this.formModel.userTypeId) === 1) {
      this.formModel.clientId = 0;
    }
  }

  save(form: NgForm): void {
    if (form.invalid || this.saving) {
      return;
    }

    if (!this.isEditMode && !this.formModel.password.trim()) {
      this.errorMessage = 'Password is required for new user.';
      return;
    }

    const payload: Record<string, string | number> = {
      email: this.formModel.email.trim(),
      authlevelId: Number(this.formModel.authlevelId),
      firstName: this.formModel.firstName.trim(),
      lastName: this.formModel.lastName.trim(),
      userTypeId: Number(this.formModel.userTypeId),
      clientId: Number(this.formModel.clientId),
      status: Number(this.formModel.status),
    };

    if (this.formModel.password.trim()) {
      payload['password'] = this.formModel.password;
    }

    this.saving = true;
    this.message = '';
    this.errorMessage = '';

    const request$ = this.isEditMode && this.editingId
      ? this.apiService.put(`/user/${this.editingId}`, payload)
      : this.apiService.post('/user', payload);

    request$.subscribe({
      next: (response) => {
        this.saving = false;
        this.message = response?.message || 'User saved.';
        this.openCreate();
        this.loadUsers();
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage = error?.error?.message || 'Failed to save user.';
      },
    });
  }

  deleteUser(row: any): void {
    const id = String(row?.id || '').trim();

    if (!id) {
      return;
    }

    const confirmed = confirm(`Delete user ${row?.email || id}?`);

    if (!confirmed) {
      return;
    }

    this.deletingId = id;
    this.errorMessage = '';
    this.message = '';

    this.apiService.delete(`/user/${id}`).subscribe({
      next: (response) => {
        this.deletingId = null;
        this.message = response?.message || 'User deleted.';
        this.loadUsers();
      },
      error: (error) => {
        this.deletingId = null;
        this.errorMessage = error?.error?.message || 'Failed to delete user.';
      },
    });
  }

  trackById(_: number, row: any): any {
    return row?.id;
  }

  private defaultForm(): UserFormModel {
    return {
      email: '',
      password: '',
      authlevelId: 1,
      firstName: '',
      lastName: '',
      userTypeId: 1,
      clientId: 0,
      status: 1,
    };
  }
}

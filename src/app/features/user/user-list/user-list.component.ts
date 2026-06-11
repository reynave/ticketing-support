import { CommonModule } from '@angular/common';
import { Component, OnInit, TemplateRef, ViewChild, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';

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
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './user-list.component.html',
  styleUrl: './user-list.component.css',
})
export class UserListComponent implements OnInit {
  @ViewChild('createUserModal') createUserModal!: TemplateRef<any>;

  private readonly apiService = inject(ApiService);
  private readonly modalService = inject(NgbModal);

  rows: any[] = [];
  loading = false;
  saving = false;
  deletingId: string | null = null;
  message = '';
  errorMessage = '';

  selectedUserTypeFilter = '';
  selectedStatusFilter = '';

  userForm: UserFormModel = this.defaultForm();
  modalRef: NgbModalRef | null = null;

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

  openCreateModal(): void {
    this.userForm = this.defaultForm();
    this.message = '';
    this.errorMessage = '';
    this.modalRef = this.modalService.open(this.createUserModal, {
      centered: true,
      backdrop: 'static',
      size: 'lg',
    });
  }

  saveUser(form: NgForm): void {
    if (form.invalid || this.saving) {
      return;
    }

    if (!this.userForm.password.trim()) {
      this.errorMessage = 'Password is required for new user.';
      return;
    }

    const payload: Record<string, string | number> = {
      email: this.userForm.email.trim(),
      authlevelId: Number(this.userForm.authlevelId),
      firstName: this.userForm.firstName.trim(),
      lastName: this.userForm.lastName.trim(),
      userTypeId: Number(this.userForm.userTypeId),
      clientId: Number(this.userForm.clientId),
      status: Number(this.userForm.status),
    };

    if (this.userForm.password.trim()) {
      payload['password'] = this.userForm.password;
    }

    this.saving = true;
    this.message = '';
    this.errorMessage = '';

    this.apiService.post('/user', payload).subscribe({
      next: (response) => {
        this.saving = false;
        this.message = response?.message || 'User created.';
        this.modalRef?.close();
        this.loadUsers();
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage = error?.error?.message || 'Failed to save user.';
      },
    });
  }

  onUserTypeChange(): void {
    if (Number(this.userForm.userTypeId) === 1) {
      this.userForm.clientId = 0;
    }
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

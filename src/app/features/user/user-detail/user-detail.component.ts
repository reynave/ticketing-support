import { CommonModule } from '@angular/common';
import { Component, OnInit, TemplateRef, ViewChild, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
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
  selector: 'app-user-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-detail.component.html',
  styleUrl: './user-detail.component.css',
})
export class UserDetailComponent implements OnInit {
  @ViewChild('editUserModal') editUserModal!: TemplateRef<any>;

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly apiService = inject(ApiService);
  private readonly modalService = inject(NgbModal);

  userId: string | null = null;
  user: any = null;
  loading = false;
  saving = false;
  message = '';
  errorMessage = '';

  userForm: UserFormModel = this.defaultForm();
  formMode: 'view' | 'edit' = 'view';
  modalRef: NgbModalRef | null = null;

  ngOnInit(): void {
    this.userId = this.route.snapshot.paramMap.get('id');
    if (this.userId) {
      this.loadUserDetail();
    }
  }

  loadUserDetail(): void {
    if (!this.userId) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.apiService.get(`/user/${this.userId}`).subscribe({
      next: (response) => {
        this.loading = false;
        this.user = response?.data;
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error?.error?.message || 'Failed to load user.';
      },
    });
  }

  openEditModal(): void {
    if (!this.user) {
      return;
    }

    this.formMode = 'edit';
    this.userForm = {
      email: String(this.user?.email || ''),
      password: '',
      authlevelId: Number(this.user?.authlevelId ?? 1),
      firstName: String(this.user?.firstName || ''),
      lastName: String(this.user?.lastName || ''),
      userTypeId: Number(this.user?.userTypeId ?? 1),
      clientId: Number(this.user?.clientId ?? 0),
      status: Number(this.user?.status ?? 1),
    };
    this.message = '';
    this.errorMessage = '';
    this.modalRef = this.modalService.open(this.editUserModal, {
      centered: true,
      backdrop: 'static',
      size: 'lg',
    });
  }

  saveUser(form: NgForm): void {
    if (form.invalid || this.saving || !this.userId) {
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

    this.apiService.put(`/user/${this.userId}`, payload).subscribe({
      next: (response) => {
        this.saving = false;
        this.message = response?.message || 'User updated.';
        this.modalRef?.close();
        this.loadUserDetail();
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage = error?.error?.message || 'Failed to update user.';
      },
    });
  }

  onUserTypeChange(): void {
    if (Number(this.userForm.userTypeId) === 1) {
      this.userForm.clientId = 0;
    }
  }

  deleteUser(): void {
    if (!this.userId) {
      return;
    }

    const confirmed = confirm(`Delete user ${this.user?.email || this.userId}?`);
    if (!confirmed) {
      return;
    }

    this.apiService.delete(`/user/${this.userId}`).subscribe({
      next: (response) => {
        alert(response?.message || 'User deleted.');
        this.router.navigate(['/users']);
      },
      error: (error) => {
        this.errorMessage = error?.error?.message || 'Failed to delete user.';
      },
    });
  }

  goBack(): void {
    history.back();
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

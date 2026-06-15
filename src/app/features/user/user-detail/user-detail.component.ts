import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';

interface UserFormModel {
  email: string;
  password: string;
  userAuthLevelId: number;
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
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly apiService = inject(ApiService);

  userId: string | null = null;
  user: any = null;
  loading = false;
  saving = false;
  message = '';
  errorMessage = '';

  userForm: UserFormModel = this.defaultForm();
  formMode: 'view' | 'edit' = 'view';
  accessRightOptions: any[] = [];

  ngOnInit(): void {
    this.loadAccessRightOptions();
    this.userId = this.route.snapshot.paramMap.get('id');
    if (this.userId) {
      this.loadUserDetail();
    }
  }

  loadAccessRightOptions(): void {
    this.apiService.get('/master/user-auth-level').subscribe({
      next: (response) => {
        this.accessRightOptions = Array.isArray(response?.data) ? response.data : [];
      },
      error: () => {
        this.accessRightOptions = [];
      },
    });
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
        this.populateFormFromUser();
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage = error?.error?.message || 'Failed to load user.';
      },
    });
  }

  startEdit(): void {
    if (!this.user) {
      return;
    }

    this.formMode = 'edit';
    this.populateFormFromUser();
    this.message = '';
    this.errorMessage = '';
  }

  cancelEdit(): void {
    this.formMode = 'view';
    this.populateFormFromUser();
    this.errorMessage = '';
  }

  saveUser(form: NgForm): void {
    if (form.invalid || this.saving || !this.userId) {
      return;
    }

    const payload: Record<string, string | number> = {
      email: this.userForm.email.trim(),
      userAuthLevelId: Number(this.userForm.userAuthLevelId),
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
        this.formMode = 'view';
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
      userAuthLevelId: 1,
      firstName: '',
      lastName: '',
      userTypeId: 1,
      clientId: 0,
      status: 1,
    };
  }

  private populateFormFromUser(): void {
    this.userForm = {
      email: String(this.user?.email || ''),
      password: '',
      userAuthLevelId: Number(this.user?.userAuthLevelId ?? 1),
      firstName: String(this.user?.firstName || ''),
      lastName: String(this.user?.lastName || ''),
      userTypeId: Number(this.user?.userTypeId ?? 1),
      clientId: Number(this.user?.clientId ?? 0),
      status: Number(this.user?.status ?? 1),
    };
  }

  private buildAccessRightLabel(row: any): string {
    const id = Number(row?.id);
    const authLevelId = Number(row?.authLevelId ?? 0);
    const name = String(row?.name ?? '');
    const status = Number(row?.status ?? 0) === 1 ? 'Active' : 'Inactive';

    return `#${id} - Auth ${authLevelId} / Module ${name} (${status})`;
  }
}

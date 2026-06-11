import { CommonModule } from '@angular/common';
import { Component, OnInit, TemplateRef, ViewChild, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgbModal, NgbModalModule, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ApiService } from '../../../core/services/api.service';

interface ClientFormModel {
  code: string;
  name: string;
  address: string;
  IndustryId: number;
  status: number;
}

interface ClientUserFormModel {
  email: string;
  password: string;
  authlevelId: number;
  firstName: string;
  lastName: string;
  status: number;
}

@Component({
  selector: 'app-client-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgbModalModule],
  templateUrl: './client-detail.component.html',
  styleUrl: './client-detail.component.css',
})
export class ClientDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly apiService = inject(ApiService);
  private readonly modalService = inject(NgbModal);

  @ViewChild('clientFormModal') clientFormModal?: TemplateRef<unknown>;
  @ViewChild('clientUserFormModal') clientUserFormModal?: TemplateRef<unknown>;

  private clientModalRef: NgbModalRef | null = null;
  private userModalRef: NgbModalRef | null = null;

  clientId: number | null = null;
  client: any | null = null;
  users: any[] = [];
  industries: any[] = [];

  loading = false;
  loadingUsers = false;
  loadingIndustries = false;
  savingClient = false;
  savingUser = false;
  deletingClient = false;
  deletingUserId: string | null = null;

  message = '';
  errorMessage = '';

  clientForm: ClientFormModel = this.defaultClientForm();
  clientFormMode: 'create' | 'update' = 'update';

  userForm: ClientUserFormModel = this.defaultUserForm();
  userFormMode: 'create' = 'create';
  editingUserId: string | null = null;

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = Number(params.get('id'));

      if (!id) {
        void this.router.navigate(['/clients']);
        return;
      }

      this.clientId = id;
      this.loadIndustries();
      this.loadClientDetail();
      this.loadClientUsers();
    });
  }

  goBack(){
    history.back();
  }

  loadClientDetail(): void {
    if (!this.clientId) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.apiService.get(`/client/${this.clientId}`).subscribe({
      next: (response) => {
        this.loading = false;
        this.client = response?.data || null;
      },
      error: (error) => {
        this.loading = false;
        this.client = null;
        this.errorMessage = error?.error?.message || 'Failed to load client detail.';
      },
    });
  }

  loadClientUsers(): void {
    if (!this.clientId) {
      return;
    }

    this.loadingUsers = true;

    this.apiService.get(`/client/${this.clientId}/users`).subscribe({
      next: (response) => {
        this.loadingUsers = false;
        this.users = Array.isArray(response?.data) ? response.data : [];
      },
      error: (error) => {
        this.loadingUsers = false;
        this.users = [];
        this.errorMessage = error?.error?.message || 'Failed to load client users.';
      },
    });
  }

  loadIndustries(): void {
    this.loadingIndustries = true;

    this.apiService.get('/master/industry').subscribe({
      next: (response) => {
        this.loadingIndustries = false;
        this.industries = Array.isArray(response?.data) ? response.data : [];
      },
      error: () => {
        this.loadingIndustries = false;
        this.industries = [];
      },
    });
  }

  openCreateClientModal(): void {
    this.clientFormMode = 'create';
    this.clientForm = this.defaultClientForm();
    this.openClientModal();
  }

  openUpdateClientModal(): void {
    if (!this.client) {
      return;
    }

    this.clientFormMode = 'update';
    this.clientForm = {
      code: String(this.client?.code || ''),
      name: String(this.client?.name || ''),
      address: String(this.client?.address || ''),
      IndustryId: Number(this.client?.IndustryId ?? 0),
      status: Number(this.client?.status ?? 1),
    };
    this.openClientModal();
  }

  saveClient(form: NgForm): void {
    if (form.invalid || this.savingClient) {
      return;
    }

    const payload = {
      code: this.clientForm.code.trim(),
      name: this.clientForm.name.trim(),
      address: this.clientForm.address.trim(),
      IndustryId: Number(this.clientForm.IndustryId),
      status: Number(this.clientForm.status),
    };

    this.savingClient = true;
    this.errorMessage = '';
    this.message = '';

    const request$ = this.clientFormMode === 'create'
      ? this.apiService.post('/client', payload)
      : this.apiService.put(`/client/${this.clientId}`, payload);

    request$.subscribe({
      next: (response) => {
        this.savingClient = false;
        this.closeClientModal();

        if (this.clientFormMode === 'create') {
          const newId = Number(response?.data?.id);
          if (newId) {
            void this.router.navigate(['/clients', newId]);
            return;
          }
        }

        this.message = response?.message || 'Client saved.';
        this.loadClientDetail();
      },
      error: (error) => {
        this.savingClient = false;
        this.errorMessage = error?.error?.message || 'Failed to save client.';
      },
    });
  }

  deleteClient(): void {
    if (!this.clientId || this.deletingClient) {
      return;
    }

    const confirmed = confirm('Delete this client? All external users under this client will be deactivated.');

    if (!confirmed) {
      return;
    }

    this.deletingClient = true;
    this.errorMessage = '';

    this.apiService.delete(`/client/${this.clientId}`).subscribe({
      next: () => {
        this.deletingClient = false;
        void this.router.navigate(['/clients']);
      },
      error: (error) => {
        this.deletingClient = false;
        this.errorMessage = error?.error?.message || 'Failed to delete client.';
      },
    });
  }

  openCreateUserModal(): void {
    this.userForm = this.defaultUserForm();
    this.editingUserId = null;
    this.openUserModal();
  }

  saveUser(form: NgForm): void {
    if (form.invalid || this.savingUser || !this.clientId) {
      return;
    }

    if (!this.userForm.password.trim()) {
      this.errorMessage = 'Password is required for new external user.';
      return;
    }

    const payload: Record<string, string | number> = {
      email: this.userForm.email.trim(),
      authlevelId: Number(this.userForm.authlevelId),
      firstName: this.userForm.firstName.trim(),
      lastName: this.userForm.lastName.trim(),
      status: Number(this.userForm.status),
    };

    if (this.userForm.password.trim()) {
      payload['password'] = this.userForm.password;
    }

    this.savingUser = true;
    this.errorMessage = '';
    this.message = '';

    this.apiService.post(`/client/${this.clientId}/users`, payload).subscribe({
      next: (response) => {
        this.savingUser = false;
        this.closeUserModal();
        this.message = response?.message || 'User created.';
        this.loadClientUsers();
      },
      error: (error) => {
        this.savingUser = false;
        this.errorMessage = error?.error?.message || 'Failed to create user.';
      },
    });
  }

  deleteUser(row: any): void {
    const userId = String(row?.id || '').trim();

    if (!userId) {
      return;
    }

    const confirmed = confirm(`Delete user ${row?.email || userId}?`);

    if (!confirmed) {
      return;
    }

    this.deletingUserId = userId;
    this.errorMessage = '';

    this.apiService.delete(`/user/${userId}`).subscribe({
      next: () => {
        this.deletingUserId = null;
        this.message = 'User deleted.';
        this.loadClientUsers();
      },
      error: (error) => {
        this.deletingUserId = null;
        this.errorMessage = error?.error?.message || 'Failed to delete user.';
      },
    });
  }

  trackById(_: number, row: any): any {
    return row?.id;
  }

  private openClientModal(): void {
    if (!this.clientFormModal) {
      return;
    }

    this.clientModalRef = this.modalService.open(this.clientFormModal, {
      size: 'lg',
      centered: true,
      backdrop: 'static',
    });
  }

  private openUserModal(): void {
    if (!this.clientUserFormModal) {
      return;
    }

    this.userModalRef = this.modalService.open(this.clientUserFormModal, {
      size: 'lg',
      centered: true,
      backdrop: 'static',
    });
  }

  closeClientModal(): void {
    this.clientModalRef?.close();
    this.clientModalRef = null;
  }

  closeUserModal(): void {
    this.userModalRef?.close();
    this.userModalRef = null;
  }

  private defaultClientForm(): ClientFormModel {
    return {
      code: '',
      name: '',
      address: '',
      IndustryId: 0,
      status: 1,
    };
  }

  private defaultUserForm(): ClientUserFormModel {
    return {
      email: '',
      password: '',
      authlevelId: 2,
      firstName: '',
      lastName: '',
      status: 1,
    };
  }
}

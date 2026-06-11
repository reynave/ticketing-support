import { CommonModule } from '@angular/common';
import { Component, TemplateRef, ViewChild, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgbModal, NgbModalModule, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ApiService } from '../../../core/services/api.service';

interface ClientFormModel {
  code: string;
  name: string;
  address: string;
  IndustryId: number;
  status: number;
}

@Component({
  selector: 'app-client-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgbModalModule],
  templateUrl: './client-list.component.html',
  styleUrl: './client-list.component.css',
})
export class ClientListComponent {
  private readonly apiService = inject(ApiService);
  private readonly router = inject(Router);
  private readonly modalService = inject(NgbModal);

  @ViewChild('createClientModal') createClientModal?: TemplateRef<unknown>;

  private modalRef: NgbModalRef | null = null;

  rows: any[] = [];
  industries: any[] = [];
  loading = false;
  loadingIndustries = false;
  saving = false;
  deletingId: number | null = null;
  message = '';
  errorMessage = '';
  formModel: ClientFormModel = this.defaultForm();

  constructor() {
    this.loadClients();
    this.loadIndustries();
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

  loadClients(): void {
    this.loading = true;
    this.errorMessage = '';

    this.apiService.get('/client').subscribe({
      next: (response) => {
        this.loading = false;
        this.rows = Array.isArray(response?.data) ? response.data : [];
      },
      error: (error) => {
        this.loading = false;
        this.rows = [];
        this.errorMessage = error?.error?.message || 'Failed to load clients.';
      },
    });
  }

  openCreateModal(): void {
    if (!this.createClientModal) {
      return;
    }

    this.formModel = this.defaultForm();
    this.errorMessage = '';
    this.modalRef = this.modalService.open(this.createClientModal, {
      size: 'lg',
      centered: true,
      backdrop: 'static',
    });
  }

  closeModal(): void {
    this.modalRef?.close();
    this.modalRef = null;
  }

  saveClient(form: NgForm): void {
    if (form.invalid || this.saving) {
      return;
    }

    const payload = {
      code: this.formModel.code.trim(),
      name: this.formModel.name.trim(),
      address: this.formModel.address.trim(),
      IndustryId: Number(this.formModel.IndustryId),
      status: Number(this.formModel.status),
    };

    this.saving = true;
    this.errorMessage = '';
    this.message = '';

    this.apiService.post('/client', payload).subscribe({
      next: (response) => {
        this.saving = false;
        this.closeModal();

        const id = Number(response?.data?.id);
        if (id) {
          void this.router.navigate(['/clients', id]);
          return;
        }

        this.message = response?.message || 'Client created.';
        this.loadClients();
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage = error?.error?.message || 'Failed to create client.';
      },
    });
  }

  goToDetail(row: any): void {
    const id = Number(row?.id);
    if (!id) {
      return;
    }

    void this.router.navigate(['/clients', id]);
  }

  deleteClient(row: any): void {
    const id = Number(row?.id);

    if (!id) {
      return;
    }

    const confirmed = confirm(`Delete client ${row?.name || id}? This will deactivate external users under this client.`);

    if (!confirmed) {
      return;
    }

    this.deletingId = id;
    this.errorMessage = '';

    this.apiService.delete(`/client/${id}`).subscribe({
      next: (response) => {
        this.deletingId = null;
        this.message = response?.message || 'Client deleted.';
        this.loadClients();
      },
      error: (error) => {
        this.deletingId = null;
        this.errorMessage = error?.error?.message || 'Failed to delete client.';
      },
    });
  }

  trackById(_: number, row: any): any {
    return row?.id;
  }

  private defaultForm(): ClientFormModel {
    return {
      code: '',
      name: '',
      address: '',
      IndustryId: 0,
      status: 1,
    };
  }
}

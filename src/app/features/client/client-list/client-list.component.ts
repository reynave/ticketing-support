import { CommonModule } from '@angular/common';
import { Component, TemplateRef, ViewChild, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgbModal, NgbModalModule, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';

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
  private readonly authService = inject(AuthService);

  readonly moduleId = 2002;

  get canAccessPage(): boolean {
    return this.authService.hasPermission(this.moduleId, 'r');
  }

  get canCreate(): boolean {
    return this.authService.hasPermission(this.moduleId, 'c');
  }

  get canDelete(): boolean {
    return this.authService.hasPermission(this.moduleId, 'd');
  }

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
  products: any[] = [];
  loadingProducts = false;
  clientsWithoutProducts: any[] = [];
  loadingWithoutProducts = false;

  constructor() {
    if (!this.canAccessPage) {
      return;
    }

    this.loadClients();
    this.loadClientsWithoutProducts();
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

    this.apiService.get('/client', { matchUserProduct: 1 }).subscribe({
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

  loadClientsWithoutProducts(): void {
    this.loadingWithoutProducts = true;

    this.apiService.get('/client/without-products').subscribe({
      next: (response) => {
        this.loadingWithoutProducts = false;
        this.clientsWithoutProducts = Array.isArray(response?.data) ? response.data : [];
      },
      error: () => {
        this.loadingWithoutProducts = false;
        this.clientsWithoutProducts = [];
      },
    });
  }

  loadProducts(): void {
    this.loadingProducts = true;

    this.apiService.get('/product-master', { parentId: 0 }).subscribe({
      next: (response) => {
        this.loadingProducts = false;
        this.products = (Array.isArray(response?.data) ? response.data : []).map((product: any) => ({
          ...product,
          checked: false,
        }));
      },
      error: () => {
        this.loadingProducts = false;
        this.products = [];
      },
    });
  }

  onProductToggle(product: any, event: Event): void {
    const input = event.target as HTMLInputElement;
    product.checked = input.checked ? 1 : 0;
  }

  openCreateModal(): void {
    if (!this.createClientModal || !this.canCreate) {
      return;
    }

    this.formModel = this.defaultForm();
    this.errorMessage = '';
    this.loadProducts();
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
    if (form.invalid || this.saving || !this.canCreate) {
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
        const id = Number(response?.data?.id);

        if (id) {
          this.saveProductsForNewClient(id);
          return;
        }

        this.saving = false;
        this.closeModal();
        this.message = response?.message || 'Client created.';
        this.loadClients();
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage = error?.error?.message || 'Failed to create client.';
      },
    });
  }

  private saveProductsForNewClient(clientId: number): void {
    const productIds = this.products
      .filter((product) => Number(product?.checked) === 1)
      .map((product) => Number(product.id));

    const finish = () => {
      this.saving = false;
      this.closeModal();
      void this.router.navigate(['/clients', clientId]);
    };

    if (!productIds.length) {
      finish();
      return;
    }

    this.apiService.put(`/client/${clientId}/products`, { productIds }).subscribe({
      next: () => finish(),
      error: () => finish(),
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
    if (!this.canDelete) {
      return;
    }

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

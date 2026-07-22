import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../../core/services/api.service';

interface ProductFormModel {
  name: string;
  parentId: number;
  status: number;
}

@Component({
  selector: 'app-master-product-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './master-product-detail.component.html',
  styleUrl: './master-product-detail.component.css',
})
export class MasterProductDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly apiService = inject(ApiService);

  productId = 0;
  product: any = null;
  parentOptions: any[] = [];

  loading = false;
  loadingParents = false;
  saving = false;
  message = '';
  errorMessage = '';

  formModel: ProductFormModel = this.defaultForm();

  ngOnInit(): void {
    this.productId = Number(this.route.snapshot.paramMap.get('id') || 0);

    if (!this.productId) {
      void this.router.navigate(['/master-product']);
      return;
    }

    void this.loadParentOptions();
    this.loadDetail();
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

  loadDetail(): void {
    this.loading = true;
    this.errorMessage = '';

    this.apiService.get(`/product-master/${this.productId}`).subscribe({
      next: (response) => {
        this.loading = false;
        this.product = response?.data || null;
        this.populateForm();
      },
      error: (error) => {
        this.loading = false;
        this.product = null;
        this.errorMessage = error?.error?.message || 'Failed to load product detail.';
      },
    });
  }

  save(form: NgForm): void {
    if (form.invalid || this.saving || !this.productId) {
      return;
    }

    const payload = {
      name: this.formModel.name.trim(),
      parentId: Number(this.formModel.parentId),
      status: Number(this.formModel.status),
    };

    this.saving = true;
    this.message = '';
    this.errorMessage = '';

    this.apiService.put(`/product-master/${this.productId}`, payload).subscribe({
      next: (response) => {
        this.saving = false;
        this.message = response?.message || 'Product updated.';
        this.product = response?.data || this.product;
        this.populateForm();
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage = error?.error?.message || 'Failed to update product.';
      },
    });
  }

  goBack(): void {
    history.back();
  }

  getParentName(parentId: number): string {
    if (!parentId) {
      return 'Root';
    }

    const parent = this.parentOptions.find((item) => Number(item?.id) === Number(parentId));
    return parent?.name || String(parentId);
  }

  private populateForm(): void {
    if (!this.product) {
      this.formModel = this.defaultForm();
      return;
    }

    this.formModel = {
      name: String(this.product.name || ''),
      parentId: Number(this.product.parentId || 0),
      status: Number(this.product.status ?? 1),
    };
  }

  private defaultForm(): ProductFormModel {
    return {
      name: '',
      parentId: 0,
      status: 1,
    };
  }
}

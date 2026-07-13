import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../../core/services/api.service';

interface TicketCategoryFormModel {
  name: string;
  parentId: number;
  weight: number;
  status: number;
}

@Component({
  selector: 'app-master-ticket-category-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './master-ticket-category-detail.component.html',
  styleUrl: './master-ticket-category-detail.component.css',
})
export class MasterTicketCategoryDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly apiService = inject(ApiService);

  categoryId = 0;
  category: any = null;
  parentOptions: any[] = [];

  loading = false;
  loadingParents = false;
  saving = false;
  message = '';
  errorMessage = '';

  formModel: TicketCategoryFormModel = this.defaultForm();

  ngOnInit(): void {
    this.categoryId = Number(this.route.snapshot.paramMap.get('id') || 0);

    if (!this.categoryId) {
      void this.router.navigate(['/master-ticket-categories']);
      return;
    }

    void this.loadParentOptions();
    this.loadDetail();
  }

  async loadParentOptions(): Promise<void> {
    this.loadingParents = true;

    try {
      const response = await firstValueFrom(this.apiService.get('/ticket-categories', { parentId: 0 }));
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

    this.apiService.get(`/ticket-categories/${this.categoryId}`).subscribe({
      next: (response) => {
        this.loading = false;
        this.category = response?.data || null;
        this.populateForm();
      },
      error: (error) => {
        this.loading = false;
        this.category = null;
        this.errorMessage = error?.error?.message || 'Failed to load ticket category detail.';
      },
    });
  }

  save(form: NgForm): void {
    if (form.invalid || this.saving || !this.categoryId) {
      return;
    }

    const payload = {
      name: this.formModel.name.trim(),
      parentId: Number(this.formModel.parentId),
      weight: Number(this.formModel.weight),
      status: Number(this.formModel.status),
    };

    this.saving = true;
    this.message = '';
    this.errorMessage = '';

    this.apiService.put(`/ticket-categories/${this.categoryId}`, payload).subscribe({
      next: (response) => {
        this.saving = false;
        this.message = response?.message || 'Ticket category updated.';
        this.category = response?.data || this.category;
        this.populateForm();
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage = error?.error?.message || 'Failed to update ticket category.';
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
    if (!this.category) {
      this.formModel = this.defaultForm();
      return;
    }

    this.formModel = {
      name: String(this.category.name || ''),
      parentId: Number(this.category.parentId || 0),
      weight: Number(this.category.weight || 0),
      status: Number(this.category.status ?? 1),
    };
  }

  private defaultForm(): TicketCategoryFormModel {
    return {
      name: '',
      parentId: 0,
      weight: 0,
      status: 1,
    };
  }
}
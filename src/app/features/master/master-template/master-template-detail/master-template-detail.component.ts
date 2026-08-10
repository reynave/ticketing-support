import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';

interface TemplateFormModel {
  name: string;
  description: string;
  version: string; 
}

@Component({
  selector: 'app-master-template-detail',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './master-template-detail.component.html',
  styleUrl: './master-template-detail.component.css',
})
export class MasterTemplateDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly apiService = inject(ApiService);

  templateId = 0;
  template: any = null;
  formattedJson = '';
  loading = false;
  saving = false;
  message = '';
  errorMessage = '';

  formModel: TemplateFormModel = this.defaultForm();

  ngOnInit(): void {
    this.templateId = Number(this.route.snapshot.paramMap.get('id') || 0);

    if (!this.templateId) {
      void this.router.navigate(['/master-template']);
      return;
    }

    this.loadDetail();
  }

  loadDetail(): void {
    this.loading = true;
    this.errorMessage = '';

    this.apiService.get(`/template/${this.templateId}`).subscribe({
      next: (response) => {
        this.loading = false;
        this.template = response?.data || null;
        this.populateForm();
      },
      error: (error) => {
        this.loading = false;
        this.template = null;
        this.errorMessage = error?.error?.message || 'Failed to load template detail.';
      },
    });
  }

  save(form: NgForm): void {
    if (form.invalid || this.saving || !this.templateId) {
      return;
    }

    const payload = {
      name: this.formModel.name.trim(),
      description: this.formModel.description.trim(),
      version: this.formModel.version.trim(), 
    };

    this.saving = true;
    this.message = '';
    this.errorMessage = '';

    this.apiService.put(`/template/${this.templateId}`, payload).subscribe({
      next: (response) => {
        this.saving = false;
        this.message = response?.message || 'Template updated.';
        this.template = response?.data || this.template;
        this.populateForm();
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage = error?.error?.message || 'Failed to update template.';
      },
    });
  }

  goBack(): void {
    history.back();
  }

  private populateForm(): void {
    if (!this.template) {
      this.formModel = this.defaultForm();
      this.formattedJson = '';
      return;
    }

    this.formModel = {
      name: String(this.template.name || ''),
      description: String(this.template.description || ''),
      version: String(this.template.version || ''), 
    };
    this.formattedJson = this.formatJson(this.template?.json);
  }

  private formatJson(value: unknown): string {
    if (value === null || value === undefined || value === '') {
      return 'No JSON data';
    }

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return JSON.stringify(parsed, null, 2);
      } catch {
        return value;
      }
    }

    return JSON.stringify(value, null, 2);
  }

  private defaultForm(): TemplateFormModel {
    return {
      name: '',
      description: '',
      version: '', 
    };
  }
}

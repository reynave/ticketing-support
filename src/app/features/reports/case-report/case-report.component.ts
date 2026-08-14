import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ApiService } from '../../../core/services/api.service';

@Component({
  selector: 'app-case-report',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './case-report.component.html',
  styleUrl: './case-report.component.css',
})
export class CaseReportComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private modalService = inject(NgbModal);

  rows: any[] = [];
  projects: any[] = [];

  loading = false;
  errorMessage = '';

  keyword = '';
  selectedProjectId = '';
  startDate = this.formatDate(this.addMonths(new Date(), -1));
  endDate = this.formatDate(new Date());

  ngOnInit(): void {
    this.loadProjects();
    this.loadReport();
  }

  async loadProjects(): Promise<void> {
    try {
      const response = await firstValueFrom(this.apiService.get('/project', { status: 1 }));
      this.projects = Array.isArray(response?.data) ? response.data : [];
    } catch {
      this.projects = [];
    }
  }

  loadReport(): void {
    this.loading = true;
    this.errorMessage = '';

    const query: any = {};
    if (this.keyword.trim()) {
      query['keyword'] = this.keyword.trim();
    }
    if (this.selectedProjectId) {
      query['projectId'] = this.selectedProjectId;
    }
    if (this.startDate) {
      query['startDate'] = this.startDate;
    }
    if (this.endDate) {
      query['endDate'] = this.endDate;
    }

    this.apiService.get('/adminReport/case', query).subscribe({
      next: (response) => {
        this.loading = false;
        this.rows = Array.isArray(response?.data) ? response.data : [];
      },
      error: (error) => {
        this.loading = false;
        this.rows = [];
        this.errorMessage = error?.error?.message || 'Failed to load case report.';
      },
    });
  }

  resetFilter(): void {
    this.keyword = '';
    this.selectedProjectId = '';
    this.startDate = '';
    this.endDate = '';
    this.loadReport();
  }

  trackById(index: number, item: any): any {
    return item?.id || index;
  }

  private addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  selectedCaseDetail: any = null;
  selectedCaseId: any = null;
  open(content: any, caseId: any): void {
    this.modalService.open(content, { size: 'lg' });
    this.selectedCaseId = caseId;
    this.selectedCaseDetail = null;
    this.apiService.get('/adminReport/case/detail', { id: this.selectedCaseId }).subscribe({
      next: (response) => {
        this.selectedCaseDetail = response.data;
      },
      error: (error) => {
        console.error('Error fetching case detail:', error);
        this.selectedCaseDetail = null;
      },
    });
  }
}

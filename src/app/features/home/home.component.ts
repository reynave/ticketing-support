import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css',
})
export class HomeComponent implements OnInit {
  private readonly apiService = inject(ApiService);
  private readonly authService = inject(AuthService);

  loading = false;
  errorMessage = '';

  tasks: any[] = [];
  cases: any[] = [];
  changeRequests: any[] = [];

  totalOpenTasks = 0;
  totalOpenCases = 0;
  totalOpenChangeRequests = 0;

  ngOnInit(): void {
    console.log('Access rights:', this.authService.getAccessRights());
    this.loadDashboard();
  }

  async loadDashboard(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';

    try {
      const [taskResponse, caseResponse, changeRequestResponse] = await Promise.all([
        firstValueFrom(this.apiService.get('/ticket', { ticketTypeId: 1 })),
        firstValueFrom(this.apiService.get('/cases')),
        firstValueFrom(this.apiService.get('/change-requests', { ticketTypeId: 3 })),
      ]);

      this.tasks = Array.isArray(taskResponse?.data) ? taskResponse.data : [];
      this.cases = Array.isArray(caseResponse?.data) ? caseResponse.data : [];
      this.changeRequests = Array.isArray(changeRequestResponse?.data)
        ? changeRequestResponse.data
        : [];

      this.totalOpenTasks = this.tasks.filter((row) => this.isOpenTicket(row?.ticketStatusId)).length;
      this.totalOpenCases = this.cases.filter((row) => this.isOpenTicket(row?.ticketStatusId)).length;
      this.totalOpenChangeRequests = this.changeRequests.filter((row) => this.isOpenTicket(row?.ticketStatusId)).length;
    } catch (error: any) {
      this.tasks = [];
      this.cases = [];
      this.changeRequests = [];
      this.totalOpenTasks = 0;
      this.totalOpenCases = 0;
      this.totalOpenChangeRequests = 0;
      this.errorMessage = error?.error?.message || 'Failed to load home dashboard data.';
    } finally {
      this.loading = false;
    }
  }

  trackById(_: number, row: any): any {
    return row?.id;
  }

  private isOpenTicket(statusId: unknown): boolean {
    const status = Number(statusId);
    return Number.isFinite(status) && status < 900;
  }
}

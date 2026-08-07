import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-ticket-history-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  providers: [DatePipe],
  templateUrl: './ticket-history-list.component.html',
  styleUrl: './ticket-history-list.component.css',
})
export class TicketHistoryListComponent {
  private readonly apiService = inject(ApiService);
	private modalService = inject(NgbModal);
  searchText = '';
  rows: any[] = [];
  loading = false;
  errorMessage = '';
  hasSearched = false;

  search(): void {
    const keyword = this.searchText.trim();

    if (!keyword) {
      this.rows = [];
      this.errorMessage = 'Ticket ID wajib diisi.';
      this.hasSearched = false;
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.hasSearched = true;

    this.apiService.get('/master/searchAllTickets', { searchText: keyword }).subscribe({
      next: (response) => {
        this.loading = false;
        const data = Array.isArray(response?.data) ? response.data : [];
        this.rows = data.filter((row :any) => row?.ticketTypeId === 1 || row?.ticketTypeId === 2);
      },
      error: (error) => {
        this.loading = false;
        this.rows = [];
        this.errorMessage = error?.error?.message || 'Gagal mencari ticket.';
      },
    });
  }

  reset(): void {
    this.searchText = '';
    this.rows = [];
    this.loading = false;
    this.errorMessage = '';
    this.hasSearched = false;
  }

  detailRoute(row: any): string {
    return row?.ticketTypeId === 2 ? '/cases' : '/tasks';
  }

  trackById(_: number, row: any): any {
    return row?.id;
  }
  open(content: any) {
    // Logic to open the modal with the provided content
    this.modalService.open(content, { size: 'md' });
  }
}

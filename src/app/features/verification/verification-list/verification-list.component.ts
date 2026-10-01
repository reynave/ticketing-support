import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import {
  NgbDatepickerModule,
  NgbModal,
  NgbModalModule,
} from '@ng-bootstrap/ng-bootstrap';
import { Subscription, firstValueFrom } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { SocketNotificationService } from '../../../core/services/socket-notification.service';

/** Model form internal komponen (bukan kontrak API). */
interface VerificationFilterForm {
  keyword: string;
  clientId: string;
  startDate: string;
  endDate: string;
}

@Component({
  selector: 'app-verification-list',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbModalModule, NgbDatepickerModule, RouterModule ],
  templateUrl: './verification-list.component.html',
  styleUrl: './verification-list.component.css',
})
export class VerificationListComponent implements OnInit, OnDestroy {
  private readonly apiService = inject(ApiService);
  private readonly authService = inject(AuthService);
  private readonly modalService = inject(NgbModal);
  private readonly router = inject(Router);
  private readonly socketNotificationService = inject(
    SocketNotificationService,
  );

  // Modul "Case Verification" (moduleId 5106).
  readonly moduleId = 5106;

  get canAccessPage(): boolean {
    return this.authService.hasPermission(this.moduleId, 'r');
  }

  get canUpdate(): boolean {
    return this.authService.hasPermission(this.moduleId, 'u');
  }

  rows: any[] = [];
  clients: any[] = [];

  loading = false;
  loadingOptions = false;
  errorMessage = '';

  form: VerificationFilterForm = {
    keyword: '',
    clientId: '',
    startDate: '',
    endDate: '',
  };

  selectedDetail: any = null;
  selectedId: string = '';
  detailLoading = false;
  detailError = '';
  showSystemInfo = false;

  actionLoading = false;
  actionError = '';
  message = '';

  private reloadSubscription?: Subscription;

  ngOnInit(): void {
    if (!this.canAccessPage) {
      return;
    }

    this.reloadSubscription = this.socketNotificationService
      .onReloadAction()
      .subscribe(() => this.loadVerification());

    this.loadOptions();
    this.loadVerification();
  }

  ngOnDestroy(): void {
    this.reloadSubscription?.unsubscribe();
  }
  checkboxAll : boolean = false;
  selectedTicketStatusId : number | null = 900;
  bulkLoading = false;
  verificationStatusOptions = [
  
    { id: 900, name: 'Closed' },
    { id: 990, name: 'Cancelled' }
  ];
  toggleSelectAll(checked: boolean): void {
    this.rows.forEach(row => row.checkbox = checked);
    this.checkboxAll = checked;
  }

  /** Jumlah case yang sedang dicentang. */
  get selectedCount(): number {
    return this.rows.filter(row => row.checkbox).length;
  }

  /** Label status target, mis. "Closed" / "Cancelled". */
  get selectedStatusLabel(): string {
    const found = this.verificationStatusOptions.find(
      (status) => status.id === Number(this.selectedTicketStatusId)
    );
    return found?.name || '';
  }

  updateAllSelected(): void {
    if (this.bulkLoading) {
      return;
    }

    const selectedIds = this.rows
      .filter(row => row.checkbox)
      .map(row => String(row.id || '').trim())
      .filter(id => id !== '');

    if (!selectedIds.length) {
      this.errorMessage = 'Please select at least one case.';
      return;
    }

    if (this.selectedTicketStatusId === null || this.selectedTicketStatusId === undefined) {
      this.errorMessage = 'Please choose a target status.';
      return;
    }

    if(
      !confirm(
        `Are you sure to set ${selectedIds.length} case(s) to ${this.selectedStatusLabel}?`
      )
    ) {
      return;
    }

    this.bulkLoading = true;
    this.errorMessage = '';
    this.message = '';

    this.apiService
      .put('/verification/bulk-status', {
        ids: selectedIds,
        action: Number(this.selectedTicketStatusId),
      })
      .subscribe({
        next: (response) => {
          this.bulkLoading = false;
          this.message = response?.message || 'Selected cases updated.';
          this.resetSelection();
          this.loadVerification();
        },
        error: (error) => {
          this.bulkLoading = false;
          this.errorMessage =
            error?.error?.message || 'Failed to update selected cases.';
        },
      });
  }

  private resetSelection(): void {
    this.checkboxAll = false;
    this.rows.forEach(row => row.checkbox = false);
  }

  clearSelection(): void {
    if (this.bulkLoading) {
      return;
    }
    this.resetSelection();
  }



  loadVerification(): void {
    this.loading = true;
    this.errorMessage = '';

    const query: any = {};
    if (this.form.keyword.trim()) {
      query['keyword'] = this.form.keyword.trim();
    }
    if (this.form.clientId) {
      query['clientId'] = this.form.clientId;
    }
    if (this.form.startDate) {
      query['startDate'] = this.toApiDate(this.form.startDate);
    }
    if (this.form.endDate) {
      query['endDate'] = this.toApiDate(this.form.endDate);
    }

    this.apiService.get('/verification', query).subscribe({
      next: (response) => {
        this.loading = false;
        this.rows = Array.isArray(response?.data) ? response.data : [];
        this.resetSelection();
      },
      error: (error) => {
        this.loading = false;
        this.rows = [];
        this.errorMessage =
          error?.error?.message || 'Failed to load verification data.';
      },
    });
  }

  async loadOptions(): Promise<void> {
    this.loadingOptions = true;

    try {
      const clientResponse = await firstValueFrom(
        this.apiService.get('/client', { status: 1 }),
      );

      this.clients = Array.isArray(clientResponse?.data)
        ? clientResponse.data
        : [];
    } catch {
      this.clients = [];
    } finally {
      this.loadingOptions = false;
    }
  }

  resetFilter(): void {
    this.form = {
      keyword: '',
      clientId: '',
      startDate: '',
      endDate: '',
    };
    this.loadVerification();
  }

  back(): void {
    history.back();
  }

  open(content: any, id: any): void {
    this.selectedId = String(id || '').trim();
    this.selectedDetail = null;
    this.detailError = '';
    this.detailLoading = true;
    this.showSystemInfo = false;

    this.modalService.open(content, { size: 'lg' });

    if (!this.selectedId) {
      this.detailLoading = false;
      this.detailError = 'Invalid verification id.';
      return;
    }

    this.apiService
      .get(`/verification/${this.selectedId}`)
      .subscribe({
        next: (response) => {
          this.detailLoading = false;
          this.selectedDetail = response?.data || null;
        },
        error: (error) => {
          this.detailLoading = false;
          this.selectedDetail = null;
          this.detailError =
            error?.error?.message || 'Failed to load verification detail.';
        },
      });
  }

  closeCase(content: any, id: any, modal: any): void {
    this.submitVerificationAction(content, id, modal, 'close');
  }

  cancelCase(content: any, id: any, modal: any): void {
    this.submitVerificationAction(content, id, modal, 'cancel');
  }

  private submitVerificationAction(
    content: any,
    id: any,
    modal: any,
    action: 'close' | 'cancel'
  ): void {
    if (!this.canUpdate || this.actionLoading) {
      return;
    }

    const caseId = String(id || '').trim();

    if (!caseId) {
      return;
    }

    const isClose = action === 'close';
    const label = isClose ? 'Close' : 'Cancel';

    if (
      !confirm(
        `Are you sure to ${label.toLowerCase()} case ${caseId}?`
      )
    ) {
      return;
    }

    this.actionLoading = true;
    this.actionError = '';

    this.apiService
      .put(`/verification/${caseId}/status`, { action })
      .subscribe({
        next: (response) => {
          this.actionLoading = false;
          this.message = response?.message || `Case ${label.toLowerCase()}d.`;
          modal.close('Action done');

          // Refresh daftar + detail agar konsisten dengan data terbaru.
          this.loadVerification();
          this.reloadDetail(content, caseId);
        },
        error: (error) => {
          this.actionLoading = false;
          this.actionError =
            error?.error?.message ||
            `Failed to ${label.toLowerCase()} case.`;
          this.reloadDetail(content, caseId);
        },
      });
  }

  private reloadDetail(content: any, id: string): void {
    this.apiService
      .get(`/verification/${id}`)
      .subscribe({
        next: (response) => {
          this.selectedDetail = response?.data || null;
          this.detailError = '';
        },
        error: () => {
          // Case sudah tidak ada di antrean verifikasi (sudah closed/cancelled).
          this.selectedDetail = null;
          this.detailError = 'This case is no longer in the verification queue.';
        },
      });
  }

  goToDetail(row: any): void {
    const id = String(row?.id || '').trim();

    if (!id) {
      return;
    }

    void this.router.navigate(['/cases', id]);
  }

  trackById(index: number, item: any): any {
    return item?.id || index;
  }

  severityBadge(color: string): string {
    if (!color) {
      return 'bg-secondary';
    }

    return `bg-${color}`;
  }

  private toApiDate(value: any): string {
    if (!value) {
      return '';
    }

    const year = String(value['year'] || '').padStart(4, '0');
    const month = String(value['month'] || '').padStart(2, '0');
    const day = String(value['day'] || '').padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
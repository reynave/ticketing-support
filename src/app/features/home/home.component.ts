import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

type KanbanType = 'tasks' | 'cases' | 'changeRequests';

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

  dragging: { type: KanbanType; index: number; moved: boolean } | null = null;
  draggable : boolean = true;
  ngOnInit(): void {
    this.draggable = true;
    console.log('Access rights:', this.authService.getAccessRights());
    this.loadDashboard();
  }

  async loadDashboard(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';

    try {
      const response = await firstValueFrom(this.apiService.get('/home'));
      const data = response?.data || {};

      this.tasks = Array.isArray(data.tasks) ? data.tasks : [];
      this.cases = Array.isArray(data.cases) ? data.cases : [];
      this.changeRequests = Array.isArray(data.changeRequests) ? data.changeRequests : [];

      this.totalOpenTasks = Number(data.totalOpenTasks) || 0;
      this.totalOpenCases = Number(data.totalOpenCases) || 0;
      this.totalOpenChangeRequests = Number(data.totalOpenChangeRequests) || 0;
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

  onDragStart(event: DragEvent, type: KanbanType, index: number): void {
    this.dragging = { type, index, moved: false };
    event.dataTransfer?.setData('text/plain', String(index));
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onDragOver(event: DragEvent, type: KanbanType, index: number): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }

    if (!this.dragging || this.dragging.type !== type || this.dragging.index === index) {
      return;
    }

    const list = this.getList(type);
    const [moved] = list.splice(this.dragging.index, 1);
    list.splice(index, 0, moved);
    this.dragging.index = index;
    this.dragging.moved = true;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
  }

  onDragEnd(): void {
    if (!this.dragging) {
      return;
    }

    const { type, moved } = this.dragging;
    this.dragging = null;

    if (moved) {
      this.persistOrder(type);
    }
  }

  private getList(type: KanbanType): any[] {
    switch (type) {
      case 'tasks':
        return this.tasks;
      case 'cases':
        return this.cases;
      case 'changeRequests':
        return this.changeRequests;
      default:
        return [];
    }
  }

  private getTicketTypeId(type: KanbanType): number {
    switch (type) {
      case 'tasks':
        return 1;
      case 'cases':
        return 2;
      case 'changeRequests':
        return 3;
      default:
        return 0;
    }
  }

  private async persistOrder(type: KanbanType): Promise<void> {
    const list = this.getList(type);
    const ids = list.map((row) => row?.id).filter(Boolean);

    if (!ids.length) {
      return;
    }

    try {
      await firstValueFrom(
        this.apiService.put('/home/sorting', {
          ticketTypeId: this.getTicketTypeId(type),
          ids,
        }),
      );
    } catch (error: any) {
      console.error('Failed to persist sorting order:', error);
      await this.loadDashboard();
    }
  }
}

import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css',
})
export class AdminLayoutComponent {
  private readonly authService = inject(AuthService);

  readonly moduleMenus = [ 
    { path: '/tasks', label: 'Tasks', icon: 'task_alt' , badge: '5' },
    { path: '/issues', label: 'Issues', icon: 'report_problem', badge: '2' },
    {
      path: '/change-requests',
      label: 'Change Requests',
      icon: 'change_circle',
      badge: '5',
    },

    { path: '/projects', label: 'Projects', icon: 'workspaces' },
    { path: '/clients', label: 'Clients', icon: 'apartment' },

    { path: '/users', label: 'Users', icon: 'group' },
  ];

  readonly masterMenus = [
    { key: 'industry', label: 'Industry', icon: 'domain' },
    { key: 'product', label: 'Product', icon: 'inventory_2' },
    { key: 'project-type', label: 'Project Type', icon: 'schema' },
    { key: 'project-billeable', label: 'Project Billeable', icon: 'payments' },
    {
      key: 'project-categories',
      label: 'Project Categories',
      icon: 'category',
    },
    { key: 'user-auth-level', label: 'User Auth Level', icon: 'verified_user' },
    { key: 'user-type', label: 'User Type', icon: 'groups' },
    {
      key: 'global-setting',
      label: 'Global Setting',
      icon: 'settings_applications',
    },
  ];

  get userName(): string {
    return this.authService.currentUser?.name || 'Administrator';
  }

  get userEmail(): string {
    return this.authService.currentUser?.email || '-';
  }

  get userInitials(): string {
    return this.authService.initials(this.userName);
  }

  back(): void {
    history.back();
  }

  logout(): void {
    this.authService.logout();
  }
}

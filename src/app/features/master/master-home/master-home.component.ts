import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-master-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './master-home.component.html',
  styleUrl: './master-home.component.css',
})
export class MasterHomeComponent {
  private readonly authService = inject(AuthService);

  // Only keys with an official moduleId are access-controlled; unmapped keys stay visible.
  readonly masterModuleIds: Record<string, number> = {
    industry: 1001,
    product: 1002,
    project: 2001,
    'project-type': 1003,
    'project-billeable': 1004,
    'ticket-categories': 1005,
    'user-auth-level': 1006,
    'global-setting': 1007,
    template: 1010,
  };

  readonly masterMenus = [
    { key: 'industry', label: 'Industry' },
    { key: 'product', label: 'Product', route: '/master-product' },
    { key: 'project', label: 'Project', route: '/projects' },
    { key: 'project-type', label: 'Project Type' },
    { key: 'project-billeable', label: 'Project Billeable' },
    { key: 'ticket-categories', label: 'Ticket Categories', route: '/master-ticket-categories' },
    { key: 'project-categories', label: 'Project Categories' },
    { key: 'template', label: 'Template', route: '/master-template' },
    { key: 'user-auth-level', label: 'User Auth Level' },
    { key: 'user-type', label: 'User Type' },
    { key: 'global-setting', label: 'Global Setting' },
  ];

  get visibleMasterMenus() {
    return this.masterMenus.filter((menu) => {
      const moduleId = this.masterModuleIds[menu.key];
      return !moduleId || this.authService.hasPermission(moduleId, 'r');
    });
  }
}

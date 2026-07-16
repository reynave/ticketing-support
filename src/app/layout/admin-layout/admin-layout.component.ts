import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css',
})
export class AdminLayoutComponent implements OnInit {

  private readonly apiService = inject(ApiService);
  private readonly authService = inject(AuthService);

  readonly moduleMenus = [ 
    { path: '/tasks', label: 'Tasks', icon: 'task_alt' , badge: '' },
    { path: '/cases', label: 'Cases', icon: 'report_problem', badge: '' },
    {
      path: '/change-requests',
      label: 'Change Requests',
      icon: 'change_circle',
      badge: '',
    },

    { path: '/projects', label: 'Projects', icon: 'workspaces' },
    { path: '/clients', label: 'Clients', icon: 'apartment' },
  //  { path: '/contact', label: 'Contact', icon: 'group' },
    { path: '/users', label: 'Users', icon: 'account_circle' },

    { path: '/rating', label: 'Rating', icon: 'star', badge: '' },
    
  ];

   readonly auditMenus = [ 
    { path: '/user-login-history', label: 'Login History', icon: 'search_activity' },
    { path: '/ticket-balance-history', label: 'Ticket Balance', icon: 'fact_check'  },
    
  ];


  readonly masterMenus = [
    { key: 'industry', label: 'Industry', icon: 'domain' },
    { key: 'product', label: 'Product', icon: 'inventory_2' },
    { key: 'project-type', label: 'Project Type', icon: 'schema' },
    { key: 'project-billeable', label: 'Project Billeable', icon: 'payments' },
    // {
    //   key: 'project-categories',
    //   label: 'Project Categories',
    //   icon: 'category',
    // },
    {
      key: 'ticket-categories',
      label: 'Ticket Categories',
      icon: 'category',
      route: '/master-ticket-categories',
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

  ngOnInit(): void {
    this.loadbBadge();
  }
  loadbBadge(){
    this.apiService.get('/master/loadbBadge').subscribe({
      next: (response) => {
        const badgeData = response.data;
        this.moduleMenus[0].badge = badgeData.find((b: { name: string; }) => b.name === 'task')?.total || '';
        this.moduleMenus[1].badge = badgeData.find((b: { name: string; }) => b.name === 'issue')?.total || '';
        this.moduleMenus[2].badge = badgeData.find((b: { name: string; }) => b.name === 'cr')?.total || '';
      },
      error: () => {
       
      },
    });
  }

  back(): void {
    history.back();
  }

  logout(): void {
    this.authService.logout();
  }
}

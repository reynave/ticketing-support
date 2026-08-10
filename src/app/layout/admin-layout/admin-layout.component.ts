import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { ApiService } from '../../core/services/api.service';
import { SocketNotificationService } from '../../core/services/socket-notification.service';
import { FormsModule } from '@angular/forms'; 
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, FormsModule],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css',
})
export class AdminLayoutComponent implements OnInit, OnDestroy {

  private readonly apiService = inject(ApiService);
  private readonly authService = inject(AuthService);
  private readonly socketNotificationService = inject(SocketNotificationService);
  private readonly router = inject(Router);
  	private modalService = inject(NgbModal);
  private socketSubscription?: Subscription;

  readonly moduleMenus = [ 
    { path: '/home', label: 'Home', icon: 'home' , badge: '' },
    { path: '/tasks', label: 'Tasks', icon: 'task_alt' , badge: '' },
    { path: '/cases', label: 'Cases', icon: 'report_problem', badge: '' },
    // {
    //   path: '/change-requests',
    //   label: 'Change Requests',
    //   icon: 'change_circle',
    //   badge: '',
    // },

    { path: '/projects', label: 'Projects', icon: 'workspaces' },
    { path: '/clients', label: 'Clients', icon: 'apartment' },
  //  { path: '/contact', label: 'Contact', icon: 'group' },
    { path: '/users', label: 'Users', icon: 'account_circle' },

    { path: '/rating', label: 'Rating', icon: 'star', badge: '' },
    
  ];

   readonly auditMenus = [ 
    { path: '/user-login-history', label: 'Login History', icon: 'search_activity' },
    { path: '/ticket-balance-history', label: 'Ticket Balance', icon: 'fact_check'  },
  //   { path: '/ticket-history', label: 'Ticket History', icon: 'conversion_path'  },
    
  ];


  readonly masterMenus = [
    { key: 'industry', label: 'Industry', icon: 'domain' },
     {
      key: 'master-product',
      label: 'Product',
      icon: 'inventory_2',
      route: '/master-product',
    },
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

    { key: 'template', label: 'Template', icon: 'description', route: '/master-template' },
   
    { key: 'user-auth-level', label: 'User Auth Level', icon: 'verified_user' },
    //{ key: 'user-type', label: 'User Type', icon: 'groups' },
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

  searchText : string = '';
  ngOnInit(): void {
    this.loadbBadge();

    this.socketSubscription = this.socketNotificationService
      .onReloadAction()
      .subscribe(() => {
        console.log('Socket notification received from server:', {
          action: 'reload',
        });
        this.loadbBadge();
      });


  }

  ngOnDestroy(): void {
    this.socketSubscription?.unsubscribe();

  }
  loadbBadge(){
    this.apiService.get('/master/loadbBadge').subscribe({
      next: (response) => {
        const badgeData = response.data;
        this.moduleMenus[1].badge = badgeData.find((b: { name: string; }) => b.name === 'task')?.total || '';
        this.moduleMenus[2].badge = badgeData.find((b: { name: string; }) => b.name === 'issue')?.total || '';
        this.moduleMenus[3].badge = badgeData.find((b: { name: string; }) => b.name === 'cr')?.total || '';
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
    searchResults : any = []; // Clear previous search results
  searchBox(content:any): void {

    // jika this.searchText lenght < 6 maka warning "Search text must be at least 6 characters long" dan return
    if (this.searchText.length < 6) {
      alert('Search text must be at least 6 characters long');
      return;
    }


    this.modalService.open(content, { size: 'xl' });
   console.log('Search text:', this.searchText);
   this.apiService.get('/master/searchTickets', { searchText: this.searchText }).subscribe({
      next: (response) => {
        const searchResults = response.data;
        console.log('Search results:', searchResults);
        this.searchResults = searchResults; // Update the search results to be displayed in the modal
      },
      error: (error) => {
        console.error('Error searching tickets:', error);
        // Handle the error as needed, e.g., show an error message to the user
      },
    });
   // this.router.navigate(['/tasks'], { queryParams: { query: this.searchText } });
    // Implement your search logic here, e.g., navigate to a search results page or filter data
  }
}

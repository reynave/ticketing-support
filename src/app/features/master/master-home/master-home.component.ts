import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-master-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './master-home.component.html',
  styleUrl: './master-home.component.css',
})
export class MasterHomeComponent {
  readonly masterMenus = [
    { key: 'industry', label: 'Industry' },
    { key: 'product', label: 'Product' },
    { key: 'project-master', label: 'Project Master', route: '/master-project' },
    { key: 'project-type', label: 'Project Type' },
    { key: 'project-billeable', label: 'Project Billeable' },
    { key: 'project-categories', label: 'Project Categories' },
    { key: 'user-auth-level', label: 'User Auth Level' },
    { key: 'user-type', label: 'User Type' },
    { key: 'global-setting', label: 'Global Setting' },
  ];
}

import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { LoginComponent } from './features/auth/login/login.component';
import { MasterHomeComponent } from './features/master/master-home/master-home.component';
import { MasterManageComponent } from './features/master/master-manage/master-manage.component';
import { ClientListComponent } from './features/client/client-list/client-list.component';
import { ClientDetailComponent } from './features/client/client-detail/client-detail.component';
import { UserListComponent } from './features/user/user-list/user-list.component';
import { UserDetailComponent } from './features/user/user-detail/user-detail.component';
import { ProjectListComponent } from './features/project/project-list/project-list.component';
import { ProjectDetailComponent } from './features/project/project-detail/project-detail.component';
import { TaskListComponent } from './features/task/task-list/task-list.component';
import { TaskDetailComponent } from './features/task/task-detail/task-detail.component';
import { AdminLayoutComponent } from './layout/admin-layout/admin-layout.component';

export const routes: Routes = [
	{
		path: 'login',
		component: LoginComponent,
	},
	{
		path: '',
		component: AdminLayoutComponent,
		canActivate: [authGuard],
		children: [
			{
				path: '',
				pathMatch: 'full',
				redirectTo: 'master',
			},
			{
				path: 'clients',
				component: ClientListComponent,
			},
			{
				path: 'clients/:id',
				component: ClientDetailComponent,
			},
			{
				path: 'users',
				component: UserListComponent,
			},
			{
				path: 'users/:id',
				component: UserDetailComponent,
			},
			{
				path: 'projects',
				component: ProjectListComponent,
			},
			{
				path: 'projects/:id',
				component: ProjectDetailComponent,
			},
			{
				path: 'tasks',
				component: TaskListComponent,
			},
			{
				path: 'tasks/:id',
				component: TaskDetailComponent,
			},
			{
				path: 'master',
				component: MasterHomeComponent,
			},
			{
				path: 'master/:masterKey',
				component: MasterManageComponent,
			},
			
		],
	},
	{
		path: '**',
		redirectTo: '',
	},
];

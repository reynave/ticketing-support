import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { LoginComponent } from './features/auth/login/login.component';
import { MasterHomeComponent } from './features/master/master-home/master-home.component';
import { MasterManageComponent } from './features/master/master-manage/master-manage.component';
import { ClientListComponent } from './features/client/client-list/client-list.component';
import { ClientDetailComponent } from './features/client/client-detail/client-detail.component';
import { UserListComponent } from './features/user/user-list/user-list.component';
import { UserDetailComponent } from './features/user/user-detail/user-detail.component';
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

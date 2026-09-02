# Access Right Usage Guide

Dokumen ini wajib dipakai saat menambahkan atau mengubah menu, halaman, tombol aksi, atau fitur yang memerlukan access right di frontend Angular.

## Source of Truth

Hak akses user berasal dari JWT login, pada property `accessRights`.

```ts
{
  moduleId: 1001,
  c: 1,
  r: 1,
  u: 1,
  d: 1,
}
```

Makna permission:

- `c`: create
- `r`: read / view
- `u`: update
- `d`: delete

Data access right bersifat role-based:

- `user.userAuthLevelId` menentukan role user.
- `user_access_right.authLevelId` mengarah ke role tersebut.
- `user_access_right.moduleId` mengarah ke module yang diakses.

## Global Auth Service

Gunakan `AuthService` sebagai satu-satunya tempat membaca JWT dan access right.

```ts
import { AuthService } from '../../core/services/auth.service';

private readonly authService = inject(AuthService);
```

Helper yang tersedia:

```ts
this.authService.decodeToken();
this.authService.getAccessRights();
this.authService.hasModuleAccess(moduleId);
this.authService.hasPermission(moduleId, action); // action: 'c' | 'r' | 'u' | 'd'
```

`getAccessRights()` selalu mengembalikan array JSON. Helper ini sudah menangani payload JWT yang berisi array langsung maupun string JSON.

`hasModuleAccess(moduleId)` bernilai `true` bila JWT memiliki entry dengan `moduleId` tersebut, tanpa melihat nilai `c/r/u/d`. **Jangan pakai helper ini untuk guard tampilan atau filter menu** — module bisa saja ada di JWT tapi seluruh permission-nya `0`.

`hasPermission(moduleId, action)` bernilai `true` hanya bila entry `moduleId` ada DAN nilai action tersebut `1`. Ini yang dipakai untuk semua guard akses (termasuk `r` untuk visibility menu/halaman).

Jangan melakukan parse JWT langsung dari component. Jangan membaca `localStorage` untuk access right dari component.

## Mapping Module

Gunakan mapping berikut untuk menu dan halaman yang sudah ada:

| Module | moduleId |
| --- | --- |
| Industry | 1001 |
| Product | 1002 |
| Project Type | 1003 |
| Project Billeable | 1004 |
| Ticket Categories | 1005 |
| User Auth Level | 1006 |
| Global Setting | 1007 |
| Template | 1010 |
| Projects | 2001 |
| Clients | 2002 |
| Contacts | 2003 |
| Users | 2004 |
| Rating | 2005 |
| Tasks | 5005 |
| Cases | 5006 |
| Change Requests | 5007 |
| Login History | 6000 |
| Ticket Balance | 6001 |
| Activity Log | 6002 |

Sumber data resmi: tabel `module` di database. Sinkron ulang tabel ini bila ada `INSERT INTO module` baru.

## Progress Checklist (Frontend Guard Implementation)

Status penerapan pola `canAccessPage` / `canCreate` / `canUpdate` / `canDelete` per module:

- [x] Users (2004) — `UserListComponent`, `UserDetailComponent`
- [x] Cases (5006) — `CaseListComponent`, `CaseDetailComponent`
- [x] Tasks (5005) — `TaskListComponent`, `TaskDetailComponent`
- [x] Clients (2002) — `ClientListComponent`, `ClientDetailComponent`
- [x] Projects (2001) — `ProjectListComponent`, `ProjectCreateComponent`, `ProjectDetailComponent`
- [x] Industry (1001) — via `MasterManageComponent` (`masterKey: industry`)
- [x] Product (1002) — `MasterProductComponent`, `MasterProductDetailComponent`
- [x] Project Type (1003) — via `MasterManageComponent` (`masterKey: project-type`)
- [x] Project Billeable (1004) — via `MasterManageComponent` (`masterKey: project-billeable`)
- [x] Ticket Categories (1005) — `MasterTicketCategoriesComponent`, `MasterTicketCategoryDetailComponent`
- [x] User Auth Level (1006) — via `MasterManageComponent` (`masterKey: user-auth-level`)
- [x] Global Setting (1007) — via `MasterManageComponent` (`masterKey: global-setting`)
- [x] Sidebar/mobile menu filtering — `admin-layout.component.ts` (`filterMenusByAccess`), `master-home.component.ts` (`visibleMasterMenus`)
- [x] Template (1010) — `MasterTemplateComponent`, `MasterTemplateDetailComponent`
- [ ] Contacts (2003) — belum ada component terpisah yang teridentifikasi
- [ ] Rating (2005) — `features/rating` (belum digarap)
- [ ] Change Requests (5007) — belum ada component terpisah yang teridentifikasi
- [ ] Login History (6000) — `features/user-login-history` (belum digarap)
- [ ] Ticket Balance (6001) — `features/ticket-balance-history` (belum digarap)
- [ ] Activity Log (6002) — belum ada component terpisah yang teridentifikasi

## Menu Rules

Setiap menu yang punya module harus menyimpan `moduleId` pada konfigurasi menu.

```ts
{ path: '/tasks', label: 'Tasks', icon: 'task_alt', moduleId: 5005 }
```

Filter menu melalui helper global (implementasi nyata ada di `admin-layout.component.ts`, method `filterMenusByAccess`):

```ts
private filterMenusByAccess(menus: any[]): any[] {
  return menus.filter(
    (menu) => !menu.moduleId || this.authService.hasPermission(menu.moduleId, 'r'),
  );
}
```

Menu hilang dari sidebar/navbar mobile bila `r: 0`, meskipun module tersebut ada di JWT. Terapkan filter yang sama pada sidebar desktop dan navbar mobile. Jangan hanya menyembunyikan salah satu tampilan.

Menu yang belum memiliki mapping module dapat tetap tampil sampai moduleId resmi ditambahkan ke tabel `module`.

## Component and Screen Rules

Setiap halaman module harus melakukan guard tampilan sejak awal component, memakai pola berikut (contoh nyata: `UserListComponent` dan `UserDetailComponent`, moduleId 2004):

```ts
readonly moduleId = 1001;

get canAccessPage(): boolean {
  return this.authService.hasPermission(this.moduleId, 'r');
}

get canCreate(): boolean {
  return this.authService.hasPermission(this.moduleId, 'c');
}

get canUpdate(): boolean {
  return this.authService.hasPermission(this.moduleId, 'u');
}

get canDelete(): boolean {
  return this.authService.hasPermission(this.moduleId, 'd');
}
```

`canAccessPage` WAJIB pakai `hasPermission(moduleId, 'r')`, bukan `hasModuleAccess`. Bila `r: 0`, halaman harus dianggap tidak bisa diakses walau module ada di JWT.

Terapkan guard ini di dua tempat:

1. **TS**: cek `canAccessPage` di awal `ngOnInit` (skip load data bila `false`), dan cek `canCreate`/`canUpdate`/`canDelete` di setiap method aksi (`saveX`, `deleteX`, `startEdit`, dll) sebelum eksekusi.
2. **HTML**: bungkus seluruh konten halaman dengan `@if (!canAccessPage) { <div class="alert alert-danger py-2">You do not have access to this module.</div> } @else { ...konten asli... }`. Tombol Create/Edit/Delete masing-masing dibungkus `@if (canCreate)`, `@if (canUpdate)`, `@if (canDelete)`.

Route/API protection tetap harus ditangani server-side; menyembunyikan UI bukan security boundary. Jangan menganggap keberadaan module otomatis berarti seluruh CRUD/read diizinkan — selalu cek permission per-action.

## Token Refresh

Access right berasal dari token pada saat login. Setelah hak role diubah, user perlu login ulang untuk mendapat JWT terbaru, kecuali aplikasi secara eksplisit menerbitkan dan menyimpan token pengganti.

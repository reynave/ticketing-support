# Agent: Angular 18 Builder — Thinktank Ticketing (Admin Frontend)

> 📌 **Dokumen ini adalah sumber kebenaran (single source of truth) untuk frontend Angular admin (`ng18`).**
> Terakhir di-sync dengan kode: **27 Oktober 2026** (commit `8a19564` "update 7 case meeting").
> Jika ada perubahan kode, dokumen ini **wajib** di-update pada sesi yang sama.
> AI agent lain **tidak perlu membaca ulang isi folder `ng18`** — baca dokumen ini dulu, lalu buka file spesifik hanya jika perlu detail implementasi.

---

## Current Scope (Tahap Sekarang)

- ✅ **Selesai**: Login/Logout/Relogin (JWT + access right), Layout admin (sidebar/navbar + search global + profil user).
- ✅ **Selesai**: Master Data (generic `master/:masterKey` + halaman khusus Product, Template, Ticket Categories), Client, Project, User.
- ✅ **Selesai**: Transaksi **Task / Case / Change Request** + log aktivitas + upload attachment + countdown SLA + submit verification.
- ✅ **Selesai**: Laporan (Task / Case / CR / Users), Rating, Ticket History, Ticket Balance History, User Login History, Verification.
- 🟡 **Sebagian**: Access right — guard `canAccessPage`/`canCreate`/`canUpdate`/`canDelete` sudah diterapkan di banyak halaman, namun sebagian modul belum tuntas. Lihat `AGENT/access-right-usage.md`.
- ⏳ **Belum ada**: Unit test menyeluruh (hanya 3 file `.spec.ts`), i18n, server-side pagination di frontend, refresh token.

### Konsep Inti Domain

- Semua entitas kerja (**Task, Case, Change Request**) disimpan backend di **satu tabel `ticket`**, dibedakan `ticketTypeId`: **1 = Task, 2 = Case, 3 = Change Request**.
- Task turunan Case/CR dibuat dari halaman detail Case/CR (`CaseCreateTaskModalComponent`) via `POST /cases/:id/tasks` atau `POST /change-requests/:id/tasks`.
- Status tiket `ticketStatusId >= 900` dianggap **closed** (UI memberi class `table-closed` / baris redup).
- SLA dihitung dari `responseDateTime` → `targetCompletationDateTime` (kolom `addHour`, `ticketSolutionTime`).
- Client (external user) & portalnya ada di aplikasi **terpisah**: `frontEnd/ng18-client` (di luar scope dokumen ini).

---

## Tech Stack

| Komponen | Versi | Keterangan |
|---|---|---|
| Angular (CLI + build) | **18.2.14** | Standalone components (tanpa NgModule) |
| TypeScript | ~5.5.2 | `strict: true` + `strictTemplates: true` |
| @ng-bootstrap/ng-bootstrap | ^17.0.1 | Modal, Datepicker (Bootstrap 5) |
| Bootstrap CSS/JS | 5.3.8 | Via **CDN** di `index.html` |
| ngx-editor | ^18.0.0 | Rich text editor (WYSIWYG) |
| rxjs | ~7.8.0 | Observable, BehaviorSubject |
| socket.io-client | ^4.8.3 | Realtime notifikasi (event `notification`) |
| zone.js | ~0.14.10 | Change detection (BUKAN zoneless) |
| Icon | — | Bootstrap Icons + Material Symbols Outlined (CDN) |
| Testing | Karma + Jasmine | `ng test` |

> ⚠️ **Penting**: Project ini **standalone components** (bootstrap via `bootstrapApplication`, bukan `AppModule`). Tidak ada `*.module.ts` selain dependency. Routing memakai **hash location** (`/#/home`).

---

## Project Root & Repo

- Root project: `c:\nodejs\8thinktank-ticketing\frontEnd\ng18`
- Repository Git berada **di dalam folder `ng18/`** (bukan di root workspace).
- Struktur paralel: `frontEnd/ng18-client` = aplikasi portal **client** (Angular, terpisah). Dokumen ini khusus admin `ng18`.

---

## Cara Menjalankan (Scripts — `package.json`)

| Command | Fungsi |
|---|---|
| `npm start` | `ng serve` → dev server di `http://localhost:4200` |
| `npm run build` | Jalankan `prebuild` lalu `ng build` (output `dist/`) |
| `npm run watch` | `generate-build-info` + `ng build --watch --configuration development` |
| `npm test` | `ng test` (Karma/Jasmine) |
| `prebuild` (auto) | `node scripts/generate-build-info.js` → tulis `src/environments/build-info.ts` |

> `scripts/generate-build-info.js` menghasilkan `buildInfo.buildCode` berformat `YYMMDDHHmm` (timestamp build), ditampilkan sebagai label "Build xxxx" di sidebar/login.

---

## Environment & Konfigurasi Runtime

| File | Isi |
|---|---|
| `src/environments/environment.ts` | Production: baca global `apiBaseUrl` & `production` (dari `env.js`) |
| `src/environments/environment.development.ts` | Development: hardcode `apiBaseUrl = 'http://localhost:3000/api'` |
| `src/environments/build-info.ts` | **Auto-generated** (jangan edit manual) |
| `public/env/env.js` | Runtime config, dimuat via `<script src="./env/env.js"></script>` di `index.html` |

```js
// public/env/env.js  (contoh saat ini)
const apiBaseUrl = 'https://crm.co.id/api-dev';
const production = false;
```

Alur penting:
- `environment.ts` mendeklarasikan `declare var apiBaseUrl` dan `declare var production` — nilai datang dari **global** yang ditetapkan `env.js` sebelum `main.ts` dieksekusi.
- Saat `ng serve` / build `--configuration development`, `angular.json` melakukan `fileReplacements` → `environment.ts` diganti `environment.development.ts`.
- `apiBaseUrl` sudah menyertakan prefix API (backend `PREFIX_SERVER=/api`), jadi path di `ApiService` selalu diawali `/`.

---

## Arsitektur & Alur Bootstrap

```
index.html ──> (script env/env.js) ──> main.ts ──> bootstrapApplication(AppComponent, appConfig)
                                                        │
                                                        ├─ provideZoneChangeDetection({ eventCoalescing: true })
                                                        ├─ provideRouter(routes, withHashLocation())
                                                        └─ provideHttpClient(withInterceptors([authInterceptor]))
```

- `AppComponent` (root) hanya berisi `<router-outlet>`; di `ngOnInit` memanggil `authService.bootstrapSession()` (restore session dari localStorage) dan memasang `setInterval` yang **me-reload halaman tiap 55 menit**.
- `AdminLayoutComponent` adalah shell untuk semua halaman terproteksi: navbar atas (logo, search global, profil, logout) + sidebar (menu) + `<router-outlet>`.
- Session login bertahan saat refresh karena token disimpan di `localStorage` (bukan sessionStorage).

---

## Folder Structure (Kondisi Real)

```
src/
├── main.ts                       # bootstrapApplication(AppComponent, appConfig)
├── index.html                    # CDN bootstrap + env.js + font icons
├── styles.css                    # design tokens (:root) + style global
├── app/
│   ├── app.config.ts             # providers aplikasi
│   ├── app.routes.ts             # SEMUA route terpusat di sini
│   ├── app.component.ts          # root component
│   ├── core/
│   │   ├── services/             # api, auth, func, socket-notification
│   │   ├── guards/auth.guard.ts  # functional guard
│   │   ├── interceptors/auth.interceptor.ts
│   │   └── components/           # modal reusable (add-contact, case-create-task)
│   ├── layout/
│   │   ├── admin-layout/         # shell navbar + sidebar
│   │   └── not-found/            # halaman 404
│   └── features/
│       ├── auth/                 # login, logout, relogin
│       ├── home/                 # dashboard
│       ├── cases/                # case-list, case-detail (+countdown, upload)
│       ├── change-requests/      # change-request-list, change-request-detail
│       ├── task/                 # task-list, task-detail
│       ├── client/               # client-list, client-detail
│       ├── project/              # project-list, project-create, project-detail
│       ├── user/                 # user-list, user-detail, user-manage
│       ├── master/               # master-home, master-manage, master-product(+detail),
│       │                         #   master-template(+detail), master-ticket-categories(+detail)
│       ├── rating/               # rating-list
│       ├── reports/              # task-report, case-report, cr-report, users-report(+detail)
│       ├── verification/         # verification-list
│       ├── ticket-history/       # ticket-history-list
│       ├── ticket-balance-history/# ticket-balance-history-list
│       └── user-login-history/   # user-login-history-list
├── environments/                 # environment.ts, environment.development.ts, build-info.ts
public/
├── env/env.js                    # config runtime (apiBaseUrl, production)
├── favicon.ico / favicon.png / img/ / root.css
scripts/
└── generate-build-info.js        # prebuild script
```

> Nama file komponen memakai pola: `<fitur>-<list|detail|manage|create>.component.{ts,html,css}`. Detail transaksi (case/CR/task) punya helper lokal: `countdown.component.ts`, `upload.service.ts`, `upload.model.ts`.

---

## Routing Table (`app.routes.ts`)

Route publik:

| Path | Component |
|---|---|
| `/login` | `LoginComponent` |
| `/relogin` | `ReloginComponent` |
| `**` | `NotFoundComponent` |

Route terproteksi (children `AdminLayoutComponent`, `canActivate: [authGuard]`):

| Path | Component | Catatan |
|---|---|---|
| `''` | redirect → `home` | |
| `/home` | `HomeComponent` | dashboard |
| `/clients`, `/clients/:id` | `ClientListComponent`, `ClientDetailComponent` | |
| `/users`, `/users/:id` | `UserListComponent`, `UserDetailComponent` | |
| `/projects` | `ProjectListComponent` | |
| `/project/create` | `ProjectCreateComponent` | |
| `/project/:id` | `ProjectDetailComponent` | |
| `/tasks`, `/tasks/:id` | `TaskListComponent`, `TaskDetailComponent` | |
| `/cases`, `/cases/:id` | `CaseListComponent`, `CaseDetailComponent` | |
| `/change-requests`, `/change-requests/:id` | `ChangeRequestListComponent`, `ChangeRequestDetailComponent` | |
| `/rating` | `RatingListComponent` | |
| `/verification` | `VerificationListComponent` | |
| `/report/task` | `TaskReportComponent` | |
| `/report/cases` | `CaseReportComponent` | |
| `/report/change-requests` | `CrReportComponent` | |
| `/report/users`, `/report/users/:id` | `UsersReportComponent`, `UserDetailReportComponent` | |
| `/user-login-history` | `UserLoginHistoryListComponent` | |
| `/ticket-balance-history` | `TicketBalanceHistoryListComponent` | |
| `/ticket` | `TicketHistoryListComponent` | path tanpa "history" |
| `/master` | `MasterHomeComponent` | daftar master |
| `/master-ticket-categories`, `/:id` | `MasterTicketCategoriesComponent`, `MasterTicketCategoryDetailComponent` | |
| `/master-product`, `/:id` | `MasterProductComponent`, `MasterProductDetailComponent` | |
| `/master-template`, `/:id` | `MasterTemplateComponent`, `MasterTemplateDetailComponent` | |
| `/master/:masterKey` | `MasterManageComponent` | generic CRUD (harus ditaruh **terakhir**) |

> ⚠️ `master/:masterKey` HARUS tetap menjadi route child terakhir agar tidak menutupi route `master-*` yang spesifik.
> Ada komponen yang **ada tapi tidak ter-registrasi di route**: `features/auth/logout`, `features/user/user-manage` (legacy/belum dipakai; logout dijalankan dari tombol di admin-layout via `authService.logout()`).

---

## Core Services & Tanggung Jawab

### `ApiService` (`core/services/api.service.ts`)
Wrapper `HttpClient`. **Semua** request API wajib lewat service ini.
```ts
get(path, query?) / post(path, body) / put(path, body) / delete(path)
```
- Otomatis menambahkan `environment.apiBaseUrl` di depan path.
- `buildParams()` membuang query bernilai `undefined`/`null`/`''`.

### `AuthService` (`core/services/auth.service.ts`)
Satu-satunya tempat membaca JWT, user, dan access right.
- Key localStorage: `8tt_auth_token` (token) & `8tt_auth_user` (user). Ada migrasi otomatis dari key lama `tt_auth_token`/`tt_auth_user`.
- API: `login()`, `fetchMe()`, `logout()`, `bootstrapSession()`.
- State user: `currentUser$` (BehaviorSubject) + getter `currentUser`, `isAuthenticated`, `token`.
- Helper: `initials(name)`, `decodeToken()`, `getAccessRights()`, `hasModuleAccess(moduleId)`, `hasPermission(moduleId, 'c'|'r'|'u'|'d')`.
- Endpoint auth: `POST /auth/login`, `GET /auth/me`.

### `FuncService` (`core/services/func.service.ts`)
Utility kecil, contoh `toMySQLDateTime(date)` → `YYYY-MM-DD HH:mm:ss`.

### `SocketNotificationService` (`core/services/socket-notification.service.ts`)
Socket.io client. Menghubungkan ke `environment.apiBaseUrl` (tanpa `/api`).
- `emitReloadAction()` → kirim `{ action: 'reload' }`.
- `onReloadAction()` → subscribe event `notification` ber-`action === 'reload'` (dipakai admin-layout untuk refresh badge).

### Guard & Interceptor (functional)
- `auth.guard.ts` → `isAuthenticated ? true : createUrlTree(['/login'])`.
- `auth.interceptor.ts` → clone request + header `Authorization: Bearer <token>` bila token ada.

---

## Access Right (moduleId & Permission)

- Hak akses berasal dari **JWT** property `accessRights` (array `{ moduleId, c, r, u, d }`), role-based.
- Guard halaman & tombol memakai pola getter (lihat `AGENT/access-right-usage.md` untuk detail + checklist).

Mapping moduleId (sumber: tabel `module` DB — sinkron ulang bila ada modul baru):

| moduleId | Module |
|---|---|
| 1001 | Industry |
| 1002 | Product |
| 1003 | Project Type |
| 1004 | Project Billeable |
| 1005 | Ticket Categories / Group Phase |
| 1006 | User Auth Level |
| 1007 | Global Setting |
| 1008 | Ticket Severity / Respond Time |
| 1009 | Ticket Solution Time |
| 1010 | Template |
| 2001 | Projects |
| 2002 | Clients |
| 2003 | Contacts |
| 2004 | Users |
| 2005 | Rating |
| 5005 | Tasks |
| 5006 | Cases |
| 5007 | Change Requests |
| 5106 | Case Verification |
| 6000 | Login History |
| 6001 | Ticket Balance |
| 6002 | Activity Log |

> Menu sidebar (`admin-layout.component.ts`) menyimpan `moduleId` di tiap item dan difilter via `filterMenusByAccess()` menggunakan `hasPermission(moduleId, 'r')`.

---

## Pola & Konvensi Kode (WAJIB)

1. **Standalone components** — setiap component `standalone: true` + daftar `imports: [...]` eksplisit.
2. **DI pakai `inject()`** (bukan constructor), kecuali butuh `NgbActiveModal` (constructor injection).
3. **Template-Driven Forms** (`FormsModule` + `NgForm`) — **bukan** Reactive Forms. Form state di objek `formModel`.
4. **HTTP call wajib `<any>`** — tidak membuat interface untuk response API (lihat `AGENT/angular18-rules.md`).
5. **Back selalu `history.back()`**.
6. **Modal** pakai `NgbModal` (`this.modalService.open(templateRef, { size, centered, backdrop })`), simpan `NgbModalRef`.
7. **Datepicker** pakai `NgbDatepickerModule` + `NgbDateStruct { year, month, day }` (bukan string).
8. **Rich text** pakai `ngx-editor` (`new Editor()`, `Toolbar`, `editor.destroy()` di `ngOnDestroy`).
9. **Konfirmasi/notifikasi** sederhana: `confirm()` untuk hapus, `alert()` untuk error (belum ada toast terstandar).
10. **Error handling**: `error?.error?.message || 'fallback'`. Response envelope backend `{ data, message }`.
11. **State flags standar**: `loading`, `saving`, `deleting`, `message`, `errorMessage`, `warningMessage`, `rows`, `formModel`.
12. **Naming method**: `loadXxx()`, `saveXxx()`, `openXxxModal()`, `closeModal()`, `defaultForm()`, `trackById()`, `goToDetail()`, `goBack()`.
13. **Prefix selector**: `app-` (`app-client-list`, `app-case-detail`, dst).
14. Format kode mengikuti `.editorconfig`: indent 2 spasi, single quote, final newline, trim trailing whitespace.

### Guard pola halaman (contoh nyata)
```ts
readonly moduleId = 5006; // Cases
get canAccessPage() { return this.authService.hasPermission(this.moduleId, 'r'); }
get canUpdate()    { return this.authService.hasPermission(this.moduleId, 'u'); }
get canDelete()    { return this.authService.hasPermission(this.moduleId, 'd'); }
```
- Cek `canAccessPage` di awal `ngOnInit` (skip load bila `false`).
- Bungkus konten HTML dengan `@if (!canAccessPage) { ... } @else { ... }`, tombol aksi dengan `@if (canCreate)` dsb.

---

## Pola Integrasi API (Endpoint yang dipakai)

Backend ada di repo terpisah (`server/`, lihat `server/AI-AGENT/agent-server.md`). Semua route backend berprefix `/api` (atau `/api-dev` di env.js).

Contoh endpoint yang dipanggil frontend:
- Auth: `POST /auth/login`, `GET /auth/me`
- CRUD: `/client`, `/client/:id`, `/user`, `/user/:id`, `/user/:id/password`, `/project`, `/project/contact`
- Transaksi: `/tasks`, `/cases`, `/change-requests` (+ `/:id`, `/:id/logs`, `/:id/tasks`, `/:id/submitInProgress`, `/:id/submitVerification`)
- Master: `/master/:masterKey` (+ `/:id`), `/master/industry`, `/master/module`, `/master/user-access-right`, `/master/searchTickets`, `/master/loadbBadge`
- Upload: `POST /upload` (multipart/form-data)

Pola save di halaman transaksi (Case/CR/Task):
1. `loadTaskDetail()` + `loadTaskDetailLog()` + `loadRelatedTasks()` di `ngOnInit`.
2. Simpan via `apiService.put/post(...)`, lalu `loadTaskDetail()` ulang.
3. Setelah sukses → `socketNotificationService.emitReloadAction()` agar halaman/user lain ikut refresh.

---

## Known Issues & Risiko

| Level | Isu | Lokasi |
|---|---|---|
| 🔴 Tinggi | `upload.service.ts` **hardcode** `apiUrl = 'http://localhost:3000'` (bukan `environment.apiBaseUrl`) | `case-detail`, `change-request-detail`, `task-detail` |
| 🟡 Sedang | `AppComponent` auto-reload tiap 55 menit (`window.location.reload()`) | `app.component.ts` |
| 🟡 Sedang | Unit test belum ada (hanya 3 `.spec.ts`: logout, relogin, not-found) | seluruh app |
| 🟡 Sedang | Access right belum tuntas di beberapa modul (Rating, CR, Login History, Ticket Balance, Activity Log, Contacts) | `AGENT/access-right-usage.md` |
| 🟡 Sedang | `public/root.css` (design tokens) duplikat dengan `src/styles.css` `:root` | `public/root.css` |
| 🟢 Rendah | Banyak `console.log` debug tersisa | berbagai komponen |
| 🟢 Rendah | Notifikasi sukses/gagal belum terstandar (masih `alert()`/`confirm()`) | seluruh app |
| 🟢 Rendah | Komponen `logout` & `user-manage` ada tapi tidak ter-registrasi di route (dead code) | `features/auth/logout`, `features/user/user-manage` |

---

## Instruksi Eksekusi AI Agent

1. **Baca dokumen ini dulu** sebelum mengubah kode. Ini mencerminkan kondisi kode terkini.
2. Ikuti **aturan wajib** di `AGENT/angular18-rules.md` (no `loadChildren`, HTTP `<any>`, Template-Driven Form, `history.back()`, prefix `8tt_` localStorage, dll).
3. Saat menambah halaman baru: buat folder `src/app/features/<fitur>/<halaman>/` (file `*.component.ts/html/css`), lalu daftarkan di `app.routes.ts` di dalam children `AdminLayoutComponent` (sebelum `master/:masterKey`).
4. Saat menambah menu sidebar: tambahkan entry di `moduleMenus`/`reportMenus`/`auditMenus`/`masterMenus` di `admin-layout.component.ts` (sertakan `moduleId` bila ada access right).
5. Terapkan guard access right (getter `canAccessPage`/`canCreate`/`canUpdate`/`canDelete`) di TS **dan** HTML. Jangan hanya mengandalkan UI — backend tetap harus memproteksi route.
6. Semua request API lewat `ApiService`; jangan panggil `HttpClient` langsung dari component kecuali benar-benar perlu (upload progress adalah pengecualian).
7. Jangan mengubah kontrak API backend tanpa instruksi eksplisit; jika backend berubah, sinkronkan ke **dokumen ini** juga.
8. Verifikasi setelah edit: jalankan `npm run build` (atau minimal `npx tsc --noEmit -p tsconfig.app.json`) untuk memastikan tidak ada error TS/template.
9. Jika menemukan ketidaksesuaian dokumen vs kode, **perbaiki dokumennya**, bukan hanya kodenya.
10. Jangan commit secret (token, password) ke dokumentasi; jangan edit `build-info.ts` manual.

---

## Referensi Dokumen Terkait

| File | Isi |
|---|---|
| `AGENT/angular-agent.md` | Dokumen ini — panduan arsitektur & konvensi frontend Angular |
| `AGENT/angular18-rules.md` | Aturan wajib pengembangan Angular proyek |
| `AGENT/access-right-usage.md` | Panduan + checklist penerapan access right (moduleId & guard) |
| `AGENT/access-right-contract.md` | Kontrak data access right (4 tabel backend) |
| `AGENT/todo-angular.md` | Todo list per phase |
| `AGENT/revisi.md` | Catatan revisi domain (user/client/project) |
| `server/AI-AGENT/agent-server.md` | Panduan backend (Express 5) — pasangan dari frontend ini |
| `frontEnd/ng18/README.md` | README bawaan Angular CLI |







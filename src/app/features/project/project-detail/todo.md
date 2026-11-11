# TODO — Template Project (table khusus `template_*`)

> **Status**: Perencanaan (rombak konsep — belum diimplementasi ulang).
> **Alasan rombak**: pendekatan lama menyimpan template sebagai `project` dengan `presence = 100` **dibatalkan** (salah — template bercampur dengan project aktif dan membingungkan saat dibuka di Project Detail).
>
> **Konsep baru**: template disimpan di **table sendiri**:
> `template_project`, `template_project_users`, `template_project_ticket_draft`, `template_project_contact`.
> Table ini **sudah dibuat** di `server/AI-AGENT/master-table.sql`.

## 1. Keputusan Desain

### Mapping table
| Table project (aktif/draft) | Table template (khusus) |
|---|---|
| — (metadata) | `template` (name, description, version) |
| `project` | `template_project` |
| `project_users` | `template_project_users` |
| `project_ticket_draft` | `template_project_ticket_draft` |
| `project_contact` | `template_project_contact` |

- **Tanpa `presence = 100`.** Table template hanya pakai `presence` `0` (terhapus) / `1` (aktif).
- Table `project` murni untuk **draft (4)** & **published (1)** — tidak ada lagi baris template di dalamnya.
- `template` = **metadata** (id auto-inc, `name`, `description`, `version`). `template_project.templateId` (INT) menunjuk ke `template.id`.

### Enum `presence` (table template)
| Nilai | Arti |
|---|---|
| `0` | terhapus (soft delete) |
| `1` | aktif |

### Prinsip clone
- **Save project/draft → template** = **clone** (data asli tetap), tulis ke `template_*` (presence=1).
- **Instantiate template → draft** = clone balik ke table project (draft `presence=4`).
- Saat clone: id `PRJ-`/`DRFT-` selalu digenerate ulang, `inputDate/updateDate = NOW()`, `inputBy/updateBy = actor`.

### Prinsip UI (master-template — read-only)
- Template **tidak bisa diedit** — hanya list + delete.
- **Matikan link** ke halaman Project Detail (membingungkan user). Baris tabel **tidak** pakai `(click)="goToDetail(...)"`.

## 2. REST API Spec

Base: `/api`. Semua endpoint via auth middleware.

| Method | Endpoint | Keterangan |
|---|---|---|
| GET | `/api/project/templates` | List template (`template_project WHERE presence = 1`), filter opsional `keyword` |
| POST | `/api/project/:id/template` | Simpan project/draft jadi template (clone ke `template_*`) |
| POST | `/api/project/template/:id/instantiate` | Buat draft baru dari template |
| DELETE | `/api/project/template/:id` | Soft-delete template + cascade child |

> `GET /template/:id` (detail) **tidak disediakan** — template read-only, tidak ada halaman detail/edit.

**POST /:id/template** body:
```json
{ "name": "Template Implementasi SAP", "description": "opsional", "version": "20261111" }
```
Response 201: `{ status, message, data: { id: <template.id>, projectId: "PRJ-XXXXXXXX" } }`.

**POST /template/:id/instantiate** body opsional `{ "name": "..." }`.
Response 201: `{ status, message, data: { id: "PRJ-XXXXXXXX" } }` — `id` draft baru (di `project`).

Semua clone dalam **1 transaksi** (all-or-nothing).

## 3. Data Mapping (clone)

### 3.1 Save project/draft → template

| Sumber | Target | Catatan |
|---|---|---|
| `payload` (name/description/version) | `template` (presence=1) | metadata; `id` auto-inc → `template_project.templateId` |
| `project` (presence 1/4) | `template_project` (presence=1) | `id` baru `PRJ-...`; `templateId` = `template.id` |
| `project_users` (projectId=src, presence=1) | `template_project_users` (projectId=templateId, presence=1) | copy `userId`, `asManager` |
| `project_ticket_draft` (projectId=src, presence=1) | `template_project_ticket_draft` (projectId=templateId, presence=1), `id`=`DRFT-...` baru | copy blueprint task: `ticketTypeId`, `ticketCategoryId`, `title`, `description`, `productChildId`, `assignTo`, `targetCompletionDate`, `sorting`, `projectSorting` |
| `ticket` (projectId=src, `ticketTypeId=1`, presence=1) — fallback bila sudah publish | `template_project_ticket_draft` | publish meng-soft-delete draft task → task blueprint diambil dari `ticket` |
| `project_contact` (projectId=src, presence=1) | `template_project_contact` (projectId=templateId, presence=1) | copy `clientId`, `userId` |

### 3.2 Instantiate template → draft

| Sumber (template) | Target (draft) | Catatan |
|---|---|---|
| `template` (name) | `project.name` | fallback nama draft bila `payload.name` kosong |
| `template_project` (presence=1) | `project` baru (presence=4, status=1) | `id` baru `PRJ-...` |
| `template_project_users` (presence=1) | `project_users` baru (presence=1) | |
| `template_project_ticket_draft` (presence=1) | `project_ticket_draft` baru (presence=1), `id`=`DRFT-...` baru | |
| `template_project_contact` (presence=1) | `project_contact` baru (presence=1) | |

---

## 4. Backend Todo (`server/modules/project/`)

> ⚠️ Code lama masih memakai `presence = 100` — **harus dirombak** ke table `template_*`.

- [ ] **`project.service.js`**
  - [ ] `listProjectTemplates(filters)` — `template_project WHERE presence = 1` (+ `keyword`).
  - [ ] `saveProjectAsTemplate(projectId, payload, actorId)` — transaksi clone (3.1) ke `template_*`.
  - [ ] `instantiateTemplate(templateId, payload, actorId)` — transaksi clone (3.2) ke table project.
  - [ ] `deleteTemplate(templateId, actorId)` — soft delete `template_*` (presence→0).
  - [ ] Revert `getProjectDetail` filter ke `presence IN (1, 4)` (hapus `100`).
- [ ] **`project.controller.js`** — handler: `listProjectTemplates`, `saveProjectAsTemplate`, `instantiateTemplate`, `deleteTemplate`.
- [ ] **`project.route.js`** — daftarkan:
  - `GET /templates`
  - `POST /:id/template`
  - `POST /template/:id/instantiate`
  - `DELETE /template/:id`

## 5. Frontend Todo (`frontEnd/ng18/src/app/features/`)

- [ ] **`master-template.component.ts` + `.html`**
  - [ ] `loadRows()` → `GET /project/templates` (data dari `template_project`).
  - [ ] **Matikan link ke Project Detail** — hapus `goToDetail()` dan semua `(click)="goToDetail(row)"` + gaya kursor pointer. Baris hanya untuk checkbox select → delete.
  - [ ] `deleteSelected()` → `DELETE /project/template/:id` (id string).
  - [ ] Hapus/abaikan `master-template-detail` (route `/master-template/:id`) — template read-only.
- [ ] **`project-detail.component.ts`**
  - [ ] `submitTemplate()` → `POST /project/:id/template` body `{ name, description, version }` (clone ke `template` + `template_*`), bukan JSON ke `/api/template`.
- [ ] **`project-create`** (draft): reuse pola modal "Save as Template" → `POST /project/:id/template`.
- [x] **Next**: tombol **"Use"** (New from Template) di `master-template` → `POST /project/template/:id/instantiate` → navigasi `/project/create/:newId`.

## 6. Edge Cases & Catatan

- [ ] Template **tidak** muncul di list draft (4) / published (1) — beda table.
- [ ] Publish tetap memproses `project_ticket_draft WHERE presence = 1` — tidak menyentuh `template_project_ticket_draft`.
- [ ] Id `DRFT-` & `PRJ-` selalu digenerate ulang saat clone (hindari bentrok PK).
- [ ] Pertahankan `sorting`/`projectSorting` saat clone.
- [ ] Delete template = cascade `template_*` (presence→0).

## 7. Asumsi (konfirmasi saat implementasi)

- [x] Setelah "Save as Template", project/draft asli tetap ada (clone, bukan move).
- [x] `name` + `description` + `version` disimpan di table `template` (metadata); `template_project.templateId` menunjuk ke `template.id`.
- [x] Template read-only (list + delete), fitur edit menyusul.
# TODO Frontend Angular 18 - Thinktank Ticketing

## 1. Persiapan Project
- [x] Bersihkan template default Angular di app root.
- [x] Set environment API base URL ke server lokal.
- [x] Pastikan struktur folder feature rapi (auth, master, shared, core).
- [x] Siapkan global style dan integrasi layout dari folder html.

## 2. Core App Setup
- [x] Setup routing tanpa loadChildren (sesuai rules).
- [x] Buat Auth Service untuk simpan token dan user aktif.
- [x] Buat HTTP interceptor untuk Authorization Bearer token.
- [x] Buat route guard untuk halaman yang butuh login.
- [x] Buat wrapper service API dengan HTTP generic any.

## 3. Auth Module (Login)
- [x] Buat halaman login (template-driven form).
- [x] Integrasi POST /api/auth/login.
- [x] Simpan token + data user dari response login.
- [x] Integrasi GET /api/auth/me saat refresh aplikasi.
- [x] Buat logout lokal (clear token + redirect login).

## 4. Layout & Navigation
- [x] Buat layout utama admin (header/sidebar/content).
- [x] Buat menu Master Data.
- [x] Buat handling tombol back pakai history.back().

## 5. Master Data Feature
- [x] Buat halaman list master data reusable.
- [x] Buat form create/update reusable (template-driven form).
- [x] Integrasi endpoint:
  - [x] GET /api/master/:masterKey
  - [x] GET /api/master/:masterKey/:id
  - [x] POST /api/master/:masterKey
  - [x] PUT /api/master/:masterKey/:id
  - [x] DELETE /api/master/:masterKey/:id
- [x] Implement masterKey awal:
  - [x] industry
  - [x] product
  - [x] project-type
  - [x] project-billeable
  - [x] project-categories
  - [x] user-auth-level
  - [x] user-type
  - [x] global-setting (update only di UI)

## 6. UX, Validation, dan Error Handling
- [ ] Tampilkan loading state saat request API.
- [ ] Tampilkan error message dari response backend.
- [ ] Tambahkan validasi form wajib sesuai field backend.
- [ ] Tambahkan konfirmasi sebelum delete.
- [ ] Standarisasi notifikasi sukses/gagal.

## 7. Styling dan Konsistensi UI
- [ ] Adaptasi desain dari html/login.html ke login component.
- [ ] Adaptasi desain dari html/list.html ke halaman list.
- [ ] Adaptasi desain dari html/detail.html dan html/form-detail.html ke form/detail.
- [ ] Rapikan responsive behavior desktop/mobile.

## 8. Testing Manual
- [ ] Test login sukses dan gagal.
- [ ] Test akses halaman protected tanpa token.
- [ ] Test seluruh CRUD master data utama.
- [ ] Test global-setting hanya update (tanpa create/delete).
- [ ] Test filter query status di endpoint master yang support status.

## 9. Finalisasi Tahap 1
- [ ] Cleanup kode dan konsistensi naming.
- [ ] Review ulang kepatuhan rules Angular proyek.
- [ ] Catat known issue dan next scope (user/client/project/ticket-balance).
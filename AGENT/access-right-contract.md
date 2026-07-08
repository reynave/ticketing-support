# Access Right Contract

Dokumen ini menjadi acuan final sebelum coding fitur Access Right.

## Tujuan

Menyamakan kontrak data antara frontend Angular dan backend API untuk 4 tabel inti:
1. user
2. user_auth_level
3. user_access_right
4. module

## Scope Fitur Access Right

Fitur access right dikelola berbasis role, bukan per user langsung.

Relasi utama:
- user.userAuthLevelId -> user_auth_level.id
- user_access_right.authLevelId -> user_auth_level.id
- user_access_right.moduleId -> module.id

Makna:
- User mewarisi hak akses dari role pada userAuthLevelId.
- Hak akses disimpan per kombinasi role + module di user_access_right.

## Kontrak Field Final

### 1) Tabel user
Field penting untuk access right:
- id (varchar)
- email (varchar)
- userAuthLevelId (int)
- userTypeId (smallint)
- clientId (int)
- status (tinyint)
- presence (tinyint)

Catatan:
- Gunakan userAuthLevelId secara konsisten.
- Hindari pemakaian authlevelId pada kode baru.

### 2) Tabel user_auth_level
Field:
- id (smallint/int)
- name (varchar)
- presence (tinyint)

Peran:
- Menjadi master role untuk assignment user dan mapping hak akses.

### 3) Tabel module
Minimal field aktif saat ini:
- id (int)
- name (varchar)

Jika backend sudah menambahkan:
- code (varchar) opsional
- presence, inputDate, inputBy, updateDate, updateBy sesuai standar table lain

### 4) Tabel user_access_right
Field utama:
- id (int)
- authLevelId (int)
- moduleId (int)
- status (tinyint)
- c (tinyint)
- r (tinyint)
- u (tinyint)
- d (tinyint)
- presence (tinyint)

Aturan nilai:
- c/r/u/d: 0 atau 1
- status: 0 atau 1
- presence: soft delete menggunakan 0

## Mapping Nama Field (Legacy vs Final)

Standarkan ke nama berikut pada kode baru:
- authlevelId -> userAuthLevelId (khusus tabel user / payload user)
- authLevelId tetap dipakai pada user_access_right

Ringkas:
- User pakai userAuthLevelId
- Access Right pakai authLevelId

## Kontrak API yang Dipakai Frontend

Endpoint yang sudah ada dan dapat dipakai:
- GET /api/master/user-auth-level
- GET /api/master/user-access-right
- POST /api/master/user-access-right
- PUT /api/master/user-access-right/:id
- DELETE /api/master/user-access-right/:id

Catatan module:
- Jika /api/master/module belum tersedia, backend perlu menambahkan key module pada master service.
- Sementara fallback bisa pakai endpoint khusus module bila sudah ada.

## Rencana UI Component Access Right

## Halaman target
- route: /user-access-right?id=<authLevelId>

## Bagian UI
1. Header role aktif
2. Tabel daftar module
3. Kolom izin C, R, U, D (checkbox 0/1)
4. Tombol simpan per baris atau simpan batch
5. Tombol back wajib history.back()

## Alur data
1. Ambil role dari query param id
2. Load daftar module
3. Load user_access_right untuk authLevelId terkait
4. Merge data menjadi matrix per module
5. Simpan perubahan ke API

## Aturan Frontend Wajib (mengikuti AGENT)

- Pakai Template Driven Form.
- HTTP call gunakan any.
- Tombol back gunakan history.back().
- Jangan ubah kontrak API backend tanpa instruksi eksplisit.

## Checklist Sebelum Coding

1. Sepakati nama field final userAuthLevelId untuk payload user.
2. Pastikan endpoint module tersedia untuk kebutuhan matrix.
3. Pastikan route /user-access-right terdaftar di app routes.
4. Pastikan tombol key di master-manage mengarah ke route valid.
5. Tentukan mode simpan: per baris atau batch.

## Keputusan Saat Ini

Untuk implementasi awal:
- Fokus role-based matrix menggunakan user_auth_level + module + user_access_right.
- Gunakan nama final userAuthLevelId pada fitur baru.
- Tetap kompatibel baca data lama selama masa transisi bila backend masih mengirim authlevelId di endpoint tertentu.

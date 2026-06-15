# RULES ANGULAR

Dokumen ini adalah aturan wajib untuk pengembangan frontend Angular pada proyek ini.

## DILARANG / Aturan Wajib Frontend Admin

Ikuti aturan ini tanpa pengecualian:

1. Dilarang pakai fitur Angular experimental/preview.
2. Dilarang pakai `loadChildren`
3. Request API wajib generic `any`:

```ts
this.http.get<any>(url, options)
this.http.post<any>(url, body, options)
```

4. Aksi back wajib `history.back()`.
5. Jangan ubah kontrak API backend tanpa instruksi eksplisit.
6. Jangan ubah task owner lain yang sedang `IN_PROGRESS`.
7. Semua service wajib pakai interface `<any>`, untuk HTTP.get, HTTP.post dan lain-lain.

### Catatan: Penggunaan `<any>` vs Interface/Class

Karena semua request HTTP wajib `<any>`, **interface TypeScript untuk response API ditiadakan** selama kontrak API belum final. Ini disengaja agar tidak ada overhead maintenance ketika shape response berubah.

Yang **boleh** tetap pakai interface/type HANYA:
- Model form input (contoh: `LoginForm`, `FilterParams`) — karena ini kontrak internal komponen, bukan dari API.


Yang **tidak perlu** dibuat:
- Interface untuk response HTTP (`MemberResponse`, `PointData`, dll.) — cukup akses properti langsung dari `response.data`.

Contoh benar:

```ts
// ✅ form model internal — boleh pakai interface
interface LoginForm {
  email: string;
  password: string;
}

// ✅ HTTP call — wajib <any>
this.http.post<any>(`${this.baseUrl}/auth/login`, payload)
  .subscribe(res => {
    const token = res.data.token; // akses langsung, tanpa cast
  });
```

8. untuk input Form gunakan **Template Drive Form**, bukan Reactive Form.   
9. Untuk halaman web, gunakan **[getbootstrap.com](https://getbootstrap.com/)**.
10. **Signal** hanya dipakai untuk state lokal di dalam komponen, jangan untuk variable global atau variable yang diakses oleh banyak komponen, atau yang banyak merubah tampilan html. Contoh : Tab History.
11. untuk variable global atau variable yang diakses oleh banyak komponen, gunakan **Service**.
12. untuk date pakai datePicker dari https://ng-bootstrap.github.io/releases/17.x/#/components/datepicker/api
13. JWT token hasil login wajib disimpan di `localStorage`, bukan `sessionStorage`.
14. Prefix key `localStorage` untuk auth wajib pakai `8tt_`.
15. Session login harus tetap bertahan saat browser refresh / reload / F5 selama token masih ada di `localStorage`.
16. Dilarang menghapus token `localStorage` saat proses bootstrap app / refresh hanya karena request `me` atau validasi awal gagal sekali. Hapus token hanya saat logout eksplisit atau ada instruksi khusus.
17. Jika ada migrasi nama key `localStorage`, wajib sediakan migrasi dari key lama ke key baru agar user tidak force logout tanpa kebutuhan.
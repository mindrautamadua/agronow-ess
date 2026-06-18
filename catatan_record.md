# Catatan Record — NIK Ganda di `_member` (Agronow ESS)

> Dibuat: 2026-06-18 · Sumber: analisa tabel `_member` (Supabase project `agronow`, DB bersama dengan agronow-insight).
> Status: **proposal — belum dieksekusi.** Tabel `_member` adalah produksi BERSAMA (dipakai app lain juga), perubahan status berdampak lintas-app.

## Konteks

Login Agronow ESS: validasi ke **API SSO holding** dulu; jika tidak tervalidasi → **fallback DB** cek `_member.member_password` (MD5). Karena satu NIK bisa dipakai >1 akun, bila **NIK + password sama** cocok ke >1 baris aktif, halaman login menampilkan **pemilih entitas/perusahaan** (`needGroup`). Tujuan analisa ini: mengurangi paksaan pemilih entitas dengan merapikan duplikat.

- Total `_member`: ~52.939 baris · status hanya `active` / `block`.
- **162 NIK** dipakai >1 akun aktif; namun yang benar-benar ambigu (NIK **+ password** sama) = **24 NIK**.
- Pemilih entitas hanya muncul untuk 24 NIK ini; sisanya login langsung (password sudah membedakan).

## Klasifikasi 24 NIK ambigu

- **Kategori A — orang asli yang SAMA, 2 record di 2 entitas (21 NIK):** duplikat hasil migrasi (HO↔Regional / induk↔anak perusahaan). Nama identik, sering email & tanggal-buat identik.
- **Kategori B — NIK placeholder seri `123456/123457/123458` (3 NIK):** dipakai beberapa orang BERBEDA (data demo/onboarding awal 2020 di RPN/Kharisma/Inacom). Butuh keputusan HR (NIK asli), bukan urusan blokir teknis.
- **Akun test murni:** `6018 "Test Admin Umum"` (di dalam 123456) — disisakan karena punya 60 poin. `55770 "Ali Jhoni Marpaung"` mencurigakan (email `asdasda@gmail.com`, NIK dummy, 0 poin).

### Pembersihan yang SUDAH dilakukan (2026-06-18)
11 akun test bernama jelas & poin=0 **di-set `block`**: `6008–6017` (Test Admin 4–13) + `6019` (Test Admin HOLDING). Reversible. Tidak mengubah jumlah 24 NIK ambigu.

---

## PROPOSAL BLOKIR — Kategori A (21 NIK → 21 record diblokir)

**Aturan keep:** simpan record dengan **aktivitas belajar tertinggi** (poin → jumlah kelas/absen) — karena setelah pemilih entitas hilang, user mendarat di record yang dipertahankan, harus yang berisi progres aslinya. Metode: `member_status='block'` (reversible).

| # | NIK | Nama | ✅ KEEP (alasan) | ⛔ BLOCK |
|---|---|---|---|---|
| 1 | 061131008 | Edi Suyono | `25129` Prima Medica (4 kelas, sejak 2023) | `38334` (kosong, 2025) |
| 2 | 10000088 | Tomi Widiastomo | `32568` Sinergi Gula (poin 50, SAP) | `32402` (poin 20) |
| 3 | 10000199 | Fauzi Nurdiana | `33362` Reg4 (poin 35, email, perush. valid) | `32602` ⚠️ |
| 4 | 12140518 | Suroto Hari S. | `32353` Reg5 (poin 60) | `54484` ⚠️ |
| 5 | 14002272 | Yoesrifar Jafar | `13546` HO (poin 465) | `32396` (poin 5) |
| 6 | 19007812 | Reymon Andika P. | `54068` PTPN IV Reg3 (2 kelas) | `54066` (kosong) |
| 7 | 2000065 | Henny Mailena S. | `9067` Reg1 (poin 385, 12 kelas) | `32284` (poin 0) |
| 8 | 2000655 | Darlin Pulungan | `12576` Reg1 (poin 60, email) | `54470` ⚠️ |
| 9 | 2004065 | Daud Purba | `11148` Reg1 (poin 55, 6 kelas) | `54582` (kosong) |
| 10 | 248104002 | Sigit Santoso | `33387` PTPN IV Reg2 (2 kelas) | `38388` (kosong) |
| 11 | 3000489 | Hendro Abner | `25693` Sri Pamela (poin 30, SAP) | `55250` (kosong) ‡ |
| 12 | 3018480 | Suwanto | `54982` Reg1 (poin 40, email) | `54981` (kosong) |
| 13 | 4010448 | Suheri | `54350` PTPN IV Reg2 (poin 20) | `54335` (poin 10) |
| 14 | 5000172 | Jarwa Rahmanta | `8926` PTPN IV Reg3 (poin 145, 10 kelas) | `25567` ⚠️ |
| 15 | 7017187 | Jodi Apriadi | `28301` HO (poin 50) | `32357` (poin 35) |
| 16 | 7017191 | Rahmat Haidy | `28305` HO (poin 115) | `32374` (poin 50) |
| 17 | 7017197 | Zevri Vedro Purba | `28311` HO (poin 125, 6 kelas) | `32377` (poin 50) |
| 18 | 8006173 | Yoyon Sonjaya | `15478` PTPN IV Reg1 (poin 200) | `32313` (poin 0) |
| 19 | 9000015 | Joko Purnomo | `32349` Reg3 (poin 235, 12 kelas) | `8904` (poin 20) |
| 20 | 9016548 | Sarah Shabirah | `13254` HO (poin 115) | `32350` (poin 55) |
| 21 | 9016549 | Tri Wahyu Irianto | `32351` Reg3 (poin 95, 4 absen) | `13255` (poin 75) |

### Daftar member_id yang diblokir (21)
```
38334, 32402, 32602, 54484, 32396, 54066, 32284, 54470, 54582, 38388,
55250, 54981, 54335, 25567, 32357, 32374, 32377, 32313, 8904, 32350, 13255
```

### SQL (jalankan hanya setelah disetujui)
```sql
-- Reversible: untuk membatalkan, ganti 'block' menjadi 'active'.
UPDATE _member SET member_status = 'block'
WHERE member_id IN (
  38334, 32402, 32602, 54484, 32396, 54066, 32284, 54470, 54582, 38388,
  55250, 54981, 54335, 25567, 32357, 32374, 32377, 32313, 8904, 32350, 13255
) AND member_status = 'active';
-- Harapan: 21 baris terpengaruh.
```

## ⚠️ 4 kasus perlu konfirmasi (record yang diblokir justru ter-link SAP)
NIK **10000199, 12140518, 2000655, 5000172** — record ber-poin tinggi (yang di-keep) TIDAK ter-link SAP, sedangkan duplikatnya ter-link SAP.
- Aman untuk login API: mapping `getMemberByNikSap` tetap menemukan record keep lewat `member_nip` (nilainya sama dengan NIK_SAP).
- Untuk #3 (10000199) record SAP-nya berperusahaan "Aghris Unknown Code" → condong tetap keep yang valid.
- Bila ingin memprioritaskan record SAP, balik keep/block-nya.

‡ Catatan #11 (3000489): orang ini punya record ke-3 (`689`, poin 175, password beda) yang tidak memicu picker → tidak disentuh. Setelah blokir tetap punya 2 record aktif (689 + 25693) tapi tak lagi ambigu.

## Dampak
- **Lintas-app:** record yang diblokir hilang juga dari dashboard app lain (agronow-insight dll.). Karena hampir semua poin 0/nyaris kosong, kehilangan data minimal. **Reversible.**
- **Hasil:** pemilih entitas hilang untuk 21 NIK Kategori A. Tersisa hanya `123456/123457/123458` (Kategori B — keputusan HR).

## Tindak lanjut
- [ ] Setujui / revisi proposal Kategori A (mis. balik 4 kasus SAP).
- [ ] Eksekusi blokir 21 record.
- [ ] Kategori B (123456/7/8): koordinasi HR untuk NIK asli.
- [ ] Pertimbangkan blokir `55770 Ali Jhoni` & `6018 Test Admin Umum`.
- [ ] Banyak akun pakai password lemah `123` (md5 `202cb9…`), mis. 19007812, 3018480, 4010448 — pertimbangkan paksa ganti password.

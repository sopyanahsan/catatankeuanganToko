# 📄 Product Requirement Document (PRD)
**Nama Proyek:** Rekonstruksi Sistem Arus Keuangan & Dashboard (`index.html`)  
**Model Bisnis:** Toko Retail Pertanian + Agen BRILink  
**Versi:** 1.0  
**Tanggal:** 23 Juli 2026  
**Status:** Ready for Implementation  

---

## 🎯 1. Latar Belakang & Tujuan

### 1.1 Masalah Utama
* **Kerancuan Keuangan:** Pencatatan arus kas toko retail pertanian tercampur dengan modal putar (*float*) BRILink, uang titipan nasabah, dan pinjaman pribadi.
* **Kesalahan Perhitungan Laba:** Laba/rugi dihitung dari pergerakan kas tanpa memisahkan hak milik pribadi dengan kewajiban, sehingga nilai Modal Bersih tidak mencerminkan riil keuangan.
* **Bug Technical:** Fitur *Profit Hari Ini* pada dashboard selalu bernilai **Rp 0** karena memanggil *endpoint* eksternal `snapshot_brankas.json` yang tidak pernah diperbarui di database.

### 1.2 Tujuan
* Merestrukturisasi sistem keuangan menggunakan **Sistem 5 Kategori Aset/Kewajiban** yang memisahkan Hak Murni dengan Kewajiban.
* Memperbaiki logika kalkulasi pada dashboard agar angka **Modal Asli Uang Pribadi (Ekuitas Bersih)** dan **Profit Hari Ini** terhitung secara presisi dan *real-time*.
* Mempertahankan seluruh UI/UX, tata letak CSS Tailwind, rute navigasi, dan integrasi Firebase Realtime Database tanpa merusak fitur yang sudah berjalan.

---

## 🏛️ 2. Arsitektur Sistem Keuangan (5 Kategori)

Seluruh entitas data pada tabel **Snapshot Brankas** dikelompokkan ke dalam 5 kategori akuntansi sederhana:

| No | Kategori Data | Sifat Akuntansi | Cakupan & Penjelasan |
| :---: | :--- | :--- | :--- |
| **1** | **Aset Pribadi** | Hak Murni (Aset) | Uang tunai di laci kasir toko, kas pribadi, dan rekening bank tabungan pribadi. |
| **2** | **Aset BRILink** | Hak Murni (Aset) | Modal putar murni milik sendiri di laci BRILink serta saldo EDC / Rekening BRILink. |
| **3** | **Piutang Toko** | Hak Murni (Aset) | Tagihan modal barang (pupuk, racun, benih) yang dibawa petani dalam bentuk bon. |
| **4** | **Piutang Orang** | Hak Murni (Aset) | Uang tunai yang dipinjamkan ke pihak ketiga / personal. |
| **5** | **Dana Titip & Hutang** | Kewajiban (Pengurang) | Uang titipan nasabah/orang lain + Nota tagihan belanja obat/pupuk dari distributor yang belum dibayar. |

---

## 🧮 3. Rumus & Kalkulasi Keuangan

### 3.1 Modal Asli Uang Pribadi (Ekuitas Bersih)
Formula untuk menghitung total kekayaan murni milik sendiri:

$$\text{Modal Asli Uang Pribadi} = (\text{Aset Pribadi} + \text{Aset BRILink} + \text{Piutang Toko} + \text{Piutang Orang}) - (\text{Dana Titip \& Hutang})$$

* **Total Aset (Uang Fisik):** Sum dari Kategori 1, 2, 3, dan 4.
* **Total Titipan & Hutang:** Sum dari Kategori 5.
* **Modal Bersih Saat Ini (`valModal`):** Total Aset $-$ Total Titipan & Hutang.

### 3.2 Profit Hari Ini (Profit Operasional)
Formula untuk menghitung arus laba/rugi operasional harian:

$$\text{Profit Hari Ini} = \text{Total Pemasukan (in)} - \text{Total Pengeluaran (out)}$$

* **Sumber Data:** Node `arus_kas/{tglHariIni}` pada Firebase Realtime Database.
* **Indikator Visual:**
  * $\text{Profit} > 0$: Badge Hijau + Indikator Naik (`🔺`).
  * $\text{Profit} < 0$: Badge Merah + Indikator Turun (`🔻`).
  * $\text{Profit} = 0$: Badge Netral + Indikator Strip (`~`).

---

## 🛡️ 4. Constraints & Guardrails (Aturan Ketat)

1. **Navigasi & Route:** Dilarang merusak rute link navigasi (`index.html`, `produk.html`, `supplier.html`, `piutang.html`, `opname.html`).
2. **Koneksi Database:** Firebase Config (`buku-besar-keuangan`), Autentikasi (`onAuthStateChanged`), dan Listener Log Realtime (`activity_logs`) **wajib dipertahankan**.
3. **Desain & UI Layout:** Tetap gunakan komponen HTML Tailwind CSS, modal pop-up, serta fitur *drag and drop* SortableJS yang ada.
4. **Fast Input Sync:** Mekanisme Fast Input (`+ PEMASUKAN` / `- PENGELUARAN`) yang melakukan sinkronisasi/auto-update nominal ke tabel brankas wajib berfungsi secara *real-time*.

---

## 🛠️ 5. Rencana Eksekusi Bertahap (Phased Roadmap)

Proses pengembangan oleh AI wajib dilakukan secara bertahap dan terarah melalui 3 fase:
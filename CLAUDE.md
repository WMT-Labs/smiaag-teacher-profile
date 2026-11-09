# CLAUDE.md

Sistem profil guru SMIAAG (Sekolah Menengah Islam Al-Amin Gombak): frontend HTML/JS biasa (`frontend/`),
backend Google Apps Script (`backend/*.gs`), database Google Sheets.

**Mula setiap sesi dengan membaca `docs/SERAH-TUGAS.md`.** Ia mengandungi status terkini, cara bekerja
dengan pemilik, senarai penambahbaikan yang belum dibuat, soalan terbuka dan urutan kerja seterusnya.

Rujukan lain: `README.md` (setup), `docs/KEPUTUSAN.md` (semua keputusan dan andaian),
`docs/SKEMA.md` (dijana), `docs/PANDUAN-UJIAN.md` (ujian oleh pemilik).

Peraturan ringkas:
- Bercakap dengan pemilik dalam Bahasa Melayu Malaysia santai; istilah teknikal kekal Inggeris.
- Semua akses Sheets melalui `backend/Repository.gs` sahaja. Semua aksi API dan peranan dalam `getActions()` (`backend/Api.gs`).
- Selepas ubah backend: `npm run bundle`, `npm run skema-md`, `npm run sql`, `npm test` (mesti 0 gagal).
- Jadual baharu yang merujuk guru: kelaskan dalam `backend/Pdpa.gs` dan beri dasar RLS dalam `scripts/jana-sql.js` (ujian akan gagal jika tidak).
- Paparan teks pengguna guna `textContent`/`UI.el`, bukan `innerHTML`.
- Jangan masukkan data guru sebenar atau rahsia ke repo.

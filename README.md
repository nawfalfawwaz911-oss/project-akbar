# Project Akbar

Akbar AR Project — materi referensi.

## Video referensi

[`WhatsApp Video 2026-11-02 at 11.33.37.mp4`](WhatsApp%20Video%202026-11-02%20at%2011.33.37.mp4)

Durasi sekitar 5,4 detik, berupa animasi 3D tanpa suara. Resolusinya kecil (352×208) dan kualitasnya agak pecah, sepertinya hasil rekaman layar yang dikirim lewat WhatsApp.

### Alurnya

1. **0–2,8 detik, kotak diam:** Sebuah kotak kardus bertutup ada di tengah layar dengan latar ungu gelap bermotif sinar memancar (sunburst). Di sisi kotak dan tutupnya samar-samar ada logo eBay timbul. Kotaknya sedikit bergoyang dan miring, kameranya juga bergeser pelan.
2. **0–2,8 detik, kursor:** Kursor mouse putih bergaya pixel yang besar masuk dari kiri. Kursornya berputar di sekitar kotak, mengecil, lalu membesar lagi di dekat pojok kanan bawah kotak.
3. **±2,8 detik, klik:** Kursor "mengeklik" kotak, dan kotaknya sedikit mengempis.
4. **±3,1 detik, tutup lepas:** Tutup kotak melesat lurus ke atas sampai keluar layar.
5. **±3,4 detik dan seterusnya, isi kotak keluar:** Kamera pindah ke sudut lebih rendah dan lebih lebar, menyorot kotak yang sudah terbuka. Sinar kuning dan magenta menyembur dari dalam kotak, dan beberapa benda melayang keluar:
   - telepon atau keypad merah
   - kaos hijau toska
   - ikon kecil putih-merah
6. **3,4 detik sampai akhir, teks:** Tulisan putih "Subscribe to the Channel Lol" muncul huruf demi huruf di depan sinar, sebagian tertutup sinar. Di pojok kanan atas juga terlihat bentuk lengkung putih.

### Gaya visual

3D mengilap yang agak kartun, mirip intro YouTube atau meme. Kamera 2.5D dicampur objek datar seperti stiker, warnanya ungu, kuning, dan magenta yang mencolok, dan potongan adegannya cepat.

## Rencana versi AR

Strukturnya terbagi tiga:

- **Pemicu:** kotak disentuh. Di AR, kursor diganti dengan tap dari pengguna, dan kotaknya bisa diletakkan di atas meja.
- **Animasi:** tutup kotak lepas.
- **Isi kotak keluar:** sinar dan benda-benda melayang keluar, dan isinya bisa diganti produk atau konten Akbar.

Untuk versi final, logo eBay sebaiknya diganti dengan branding sendiri.

## Progress live

Halaman live: https://nawfalfawwaz911-oss.github.io/project-akbar/ — otomatis cek update setiap 30 detik.

Tambah screenshot progress:

```
tools/add-progress.sh path/ke/screenshot.png "Judul" "Keterangan opsional"
```

## Recreation di After Effects

- `ae/build.jsx` — script ExtendScript yang membangun semuanya di AE 2026: kotak 3D manual (solid 3D + lampu + 2 kamera), kursor pixel, klik, tutup lepas, sinar, item, dan teks mengetik. Gerak dicocokkan frame-per-frame dengan video referensi.
- `ae/akbar-box.aep` — project AE. Comp **Main** = tanpa background (transparan), comp **Preview** = dengan background sunburst ungu.
- `renders/akbar-box_preview.mp4` — preview H.264.
- Render transparan (`renders/akbar-box_alpha.mov`, ProRes 4444 + alpha, 1920×1080, 30 fps, 5,4 dtk) tidak diunggah karena >100 MB.

Jalankan ulang: `osascript -e 'tell application "Adobe After Effects 2026" to DoScriptFile "<path>/ae/build.jsx"'`

### Download file AE

- Project: https://github.com/nawfalfawwaz911-oss/project-akbar/raw/main/ae/akbar-box.aep
- Riwayat versi: https://github.com/nawfalfawwaz911-oss/project-akbar/commits/main/ae/akbar-box.aep
- Upload perubahan: `tools/sync-ae.sh`

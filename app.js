// =================================================================
// KONFIGURASI DATABASE (REST API ENDPOINT)
// =================================================================
const FIREBASE_BASE_URL = "https://buku-besar-keuangan-default-rtdb.asia-southeast1.firebasedatabase.app";

// Variabel Global untuk menampung data bersih
let dataRiwayatGlobal = [];
let chartInstance = null;

/**
 * 1. INDIKATOR KONEKSI OTOMATIS (CEK STATUS REST API)
 */
function updateStatusKoneksi(status, pesan = "") {
  const dbStatus = document.getElementById("statusKoneksi");
  if (!dbStatus) return;

  if (status === "terhubung") {
    dbStatus.innerHTML = `<span class="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]"></span> Terhubung`;
    dbStatus.className = "text-xs font-bold text-green-700 flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-full shadow-sm border border-green-200";
  } else if (status === "eror") {
    dbStatus.innerHTML = `<span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Gagal Konek: ${pesan}`;
    dbStatus.className = "text-xs font-bold text-red-700 flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-full shadow-sm border border-red-200";
  } else {
    dbStatus.innerHTML = `<span class="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span> Menyambung...`;
    dbStatus.className = "text-xs font-bold text-gray-400 flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm";
  }
}

/**
 * 2. FUNGSI AMBIL DATA (GET METHOD VIA FETCH)
 */
async function loadFirebaseData() {
  updateStatusKoneksi("menyambung");
  try {
    console.log("Memulai fetch REST API ke Firebase...");
    // Tambahkan query timestamp agar browser tidak nge-cache data lama
    const response = await fetch(`${FIREBASE_BASE_URL}/buku_kas.json?ts=${new Date().getTime()}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const rawData = await response.json();
    let allData = [];

    if (rawData) {
      Object.keys(rawData).forEach((tglRaw) => {
        const dateObj = new Date(tglRaw);
        const formattedDate = dateObj.toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });

        // Handle jika struktur data berupa array atau objek bertingkat
        if (Array.isArray(rawData[tglRaw])) {
          rawData[tglRaw].forEach((item, index) => {
            if (item) {
              allData.push({
                rowId: index,
                tanggalRaw: tglRaw,
                tanggal: formattedDate,
                uraian: item.nama || item.uraian,
                kategori: item.kategori,
                nominal: parseFloat(item.nominal) || 0,
                timestamp: item.timestamp || null
              });
            }
          });
        } else if (typeof rawData[tglRaw] === "object") {
          Object.keys(rawData[tglRaw]).forEach((key) => {
            const item = rawData[tglRaw][key];
            allData.push({
              rowId: key,
              tanggalRaw: tglRaw,
              tanggal: formattedDate,
              uraian: item.nama || item.uraian,
              kategori: item.kategori,
              nominal: parseFloat(item.nominal) || 0,
              timestamp: item.timestamp || null
            });
          });
        }
      });
    }
    
    updateStatusKoneksi("terhubung");
    return allData;

  } catch (e) {
    console.error("Firebase REST Load Error:", e);
    updateStatusKoneksi("eror", e.message);
    return [];
  }
}

/**
 * 3. FUNGSI SIMPAN DATA BARU (POST METHOD VIA FETCH)
 */
async function simpanTransaksiKeFirebase(tanggalRaw, dataBaru) {
  try {
    // Jalur POST REST API langsung mengarah ke node tanggal spesifik
    const response = await fetch(`${FIREBASE_BASE_URL}/buku_kas/${tanggalRaw}.json`, {
      method: "POST", // Pakai POST untuk auto-generate unik ID dari Firebase
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        nama: dataBaru.uraian,
        kategori: dataBaru.kategori,
        nominal: dataBaru.nominal,
        timestamp: new Date().toISOString()
      })
    });

    if (!response.ok) throw new Error("Gagal menyimpan data ke server.");
    
    console.log("Data sukses tersimpan via REST API!");
    await calculateAndRenderApp(); // Pemicu muat ulang data otomatis setelah simpan
    return true;
  } catch (e) {
    console.error("Gagal simpan data:", e);
    alert("Gagal menyimpan data: " + e.message);
    return false;
  }
}

/**
 * 4. FUNGSI UTAMA KALKULASI & RENDERING
 */
async function calculateAndRenderApp() {
  // Ambil data segar dari Firebase
  dataRiwayatGlobal = await loadFirebaseData();
  
  // Amankan komponen tabel "Menghubungkan Database..." agar berganti data asli
  const tabelBody = document.getElementById("tabelSnapshotBody");
  if (tabelBody) {
    tabelBody.innerHTML = ""; // Bersihkan status memuat
    
    if (dataRiwayatGlobal.length === 0) {
      tabelBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-gray-400">Belum ada data transaksi harian.</td></tr>`;
    } else {
      // Loop data dan render ke baris tabel lu yang lama
      dataRiwayatGlobal.forEach((item) => {
        const row = document.createElement("tr");
        row.className = "border-b border-gray-100 hover:bg-gray-50 transition";
        row.innerHTML = `
          <td class="p-3 text-sm text-gray-700">${item.uraian}</td>
          <td class="p-3 text-sm text-gray-600">${item.kategori}</td>
          <td class="p-3 text-sm text-gray-500">${item.tanggal}</td>
          <td class="p-3 text-sm font-bold text-right ${item.kategori.toLowerCase() === 'pemasukan' ? 'text-green-600' : 'text-red-500'}">
            Rp ${item.nominal.toLocaleString("id-ID")}
          </td>
        `;
        tabelBody.appendChild(row);
      });
    }
  }

  // Panggil fungsi render grafik andalan lu jika ada
  if (typeof renderGrafikModal === "function") {
    renderGrafikModal(dataRiwayatGlobal);
  }
}

// Jalankan otomatis saat halaman pertama kali dibuka browser
document.addEventListener("DOMContentLoaded", () => {
  calculateAndRenderApp();
});
/**
 * 5. FUNGSI UNTUK GENERATE GRAFIK (CHART.JS)
 * Sesuai Layout Tren Murni Pada Gambar image_b10cce.png
 */
function renderGrafikModal(data) {
  const canvasElement = document.getElementById('grafikModalCanvas');
  if (!canvasElement) return;

  // 1. Kelompokkan & Akumulasikan data berdasarkan tanggal secara kronologis
  const kumpulanHari = {};
  
  // Urutkan data dari tanggal terlama ke terbaru agar grafik tidak acak-acakan
  data.sort((a, b) => a.tanggalRaw.localeCompare(b.tanggalRaw));

  data.forEach(item => {
    const tglLabel = item.tanggal; // Menggunakan format tanggal lokal (e.g., "17 Jun")
    if (!kumpulanHari[tglLabel]) {
      kumpulanHari[tglLabel] = { pemasukan: 0, pengeluaran: 0 };
    }
    if (item.kategori.toLowerCase() === 'pemasukan') {
      kumpulanHari[tglLabel].pemasukan += item.nominal;
    } else if (item.kategori.toLowerCase() === 'pengeluaran') {
      kumpulanHari[tglLabel].pengeluaran += item.nominal;
    }
  });

  // Pecah data hasil kelompokkan ke dalam Array untuk Chart.js
  const labels = Object.keys(kumpulanHari);
  const dataPemasukan = [];
  const dataPengeluaran = [];
  const dataModalBersih = [];
  
  // Set nilai baseline modal awal agar chart terlihat proporsional (bisa disesuaikan)
  let akumulasiModal = 28000000; 

  labels.forEach(tgl => {
    const pem = kumpulanHari[tgl].pemasukan;
    const pen = kumpulanHari[tgl].pengeluaran;
    
    dataPemasukan.push(pem);
    dataPengeluaran.push(pen);
    
    // Rumus hitung modal bersih berjalan: Modal Awal + Masuk - Keluar
    akumulasiModal += (pem - pen);
    dataModalBersih.push(akumulasiModal);
  });

  // 2. Hancurkan instance chart lama jika ada (mencegah error tumpang tindih saat refresh data)
  if (chartInstance) {
    chartInstance.destroy();
  }

  // 3. Inisialisasi Grafik Baru Menggunakan Chart.js
  chartInstance = new Chart(canvasElement, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Modal Bersih',
          data: dataModalBersih,
          borderColor: '#10b981', // Emerald 500 (Hijau Pekat)
          backgroundColor: 'rgba(16, 185, 129, 0.08)', // Efek bayangan hijau di bawah garis
          fill: true,
          tension: 0.3, // Membuat lengkungan garis halus menyerupai gambar luar
          borderWidth: 3,
          pointRadius: 4,
          pointBackgroundColor: '#10b981'
        },
        {
          label: 'Pemasukan',
          data: dataPemasukan,
          borderColor: '#4ade80', // Green 400 (Hijau Muda)
          backgroundColor: 'transparent',
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: '#4ade80'
        },
        {
          label: 'Pengeluaran',
          data: dataPengeluaran,
          borderColor: '#ef4444', // Red 500 (Merah)
          backgroundColor: 'transparent',
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: '#ef4444'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            boxWidth: 40,
            boxHeight: 8,
            font: {
              family: "'Plus Jakarta Sans', sans-serif",
              size: 12,
              weight: 'bold'
            },
            color: '#4b5563'
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) label += ': ';
              if (context.parsed.y !== null) {
                label += 'Rp ' + context.parsed.y.toLocaleString('id-ID');
              }
              return label;
            }
          }
        }
      },
      scales: {
        y: {
          grid: { color: '#f3f4f6' },
          ticks: {
            callback: function(value) {
              return 'Rp ' + value.toLocaleString('id-ID');
            },
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
            color: '#9ca3af'
          }
        },
        x: {
          grid: { display: false },
          ticks: {
            font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
            color: '#9ca3af'
          }
        }
      }
    }
  });
}
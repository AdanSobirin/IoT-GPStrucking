// ============================================================
// components/DriverManagement.jsx
// ============================================================
import React, { useState, useEffect, useRef  } from 'react';
import { fetchDriverHistory, fetchVehiclesDropdown } from '../services/api';
import { 
  User, Star, Truck, MessageSquare, FileText, Route, 
  CheckSquare, Zap, Download, Printer, MoreVertical, 
  ChevronLeft, ChevronRight 
} from 'lucide-react';
import Swal from 'sweetalert2';
import { createDriver, updateDriver, fetchLiveTrucks, softDeleteDriver} from '../services/api';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';


export default function DriverManagement() {
  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [vehicleOptions, setVehicleOptions] = useState([]);

  // ─── VIEW DOCS: HARI INI ───
  const [isDocsModalOpen, setIsDocsModalOpen] = useState(false);


// ─── STATE UNTUK MODAL FORM TAMBAH, edit  supir
      const [isModalOpen, setIsModalOpen] = useState(false);
      const [currentId, setCurrentId] = useState(null);
      const [isEditing, setIsEditing] = useState(false);
      const [formData, setFormData] = useState({ name: '', username: '', password: '' });

      // 1. Fungsi untuk Tambah (Add New)
      const openAddModal = () => {
        setIsEditing(false); // Mode Tambah
        setFormData({ 
          name: '', 
          username: '', 
          password: '', 
          vehicle_id: '', 
          status: 'Standby'
        }); // Reset form jadi kosong
        setIsModalOpen(true);
      };

      // 2. Fungsi untuk Edit
      const openEditModal = (driver) => {
          setIsEditing(true);
          setCurrentId(typeof driver.id === 'string' ? driver.id.split('-')[1] : driver.id);
          setFormData({ 
            name: driver.driver_name || driver.name || '', 
            username: driver.username || '', 
            password: '', // Dikosongkan demi keamanan
            vehicle_id: driver.vehicle_id || '', 
            status: driver.is_active ? 'Standby' : 'Inactive' 
          }); 
          
          setIsModalOpen(true);
        };

      const loadDrivers = async () => {
    setIsLoading(true);
    try {
      const data = await fetchDriverHistory();
      setDrivers(data);
      if (data && data.length > 0 && !selectedDriver) {
        setSelectedDriver(data[0]);
      }
    } catch (err) {
      setError("Gagal memuat data supir.");
    } finally {
      setIsLoading(false);
    }
  };
const handleDelete = async (id) => {
  const numericId = typeof id === 'string' ? id.split('-')[1] : id;
  console.log("Memproses ID angka:", numericId);
  const confirm = await Swal.fire({
    title: 'Hapus Supir?',
    text: "Data tidak bisa dikembalikan!",
    icon: 'warning',
    showCancelButton: true,
    background: '#0f172a',
    color: '#fff',
    confirmButtonColor: '#ef4444',
    confirmButtonText: 'Ya, Nonaktifkan!'
  });

  if (confirm.isConfirmed) {
    try {
      // Pastikan fungsi deleteDriver ada di services/api.js Anda
      await softDeleteDriver(numericId);
      Swal.fire({icon: 'success', 
      title: 'Sukses!', 
      text: 'Data berhasil dinonaktifkan', 
      background: '#0f172a', 
      color: '#fff' 
    });
      loadDrivers(); // Panggil fungsi refresh
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: err.message, background: '#0f172a', color: '#fff' });
    }
  }
};

//menambahkan state untuk live tracking truk
const [liveTrucks, setLiveTrucks] = useState([]);

useEffect(() => {
  const fetchLiveTrucksData = async () => {
    try {
      const data = await fetchLiveTrucks();
      setLiveTrucks(data);
    } catch (err) {
      console.error("Gagal memuat data live tracking truk:", err);
    }
  };

  fetchLiveTrucksData();
}, []);

     const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Konversi data sebelum dikirim ke FastAPI
        const payload = {
          name: formData.name,
          username: formData.username,
          password: formData.password,
          vehicle_id: formData.vehicle_id ? parseInt(formData.vehicle_id) : null, // Ubah ke integer karena DB meminta integer
          is_active: formData.status === 'Standby' || formData.status === 'Sedang Jalan' // true jika aktif
        };

        try {
          if (isEditing) {
            await updateDriver(currentId, payload);
            Swal.fire({ icon: 'success', title: 'Sukses!', text: 'Data diperbarui', background: '#0f172a', color: '#fff' });
          } else {
            await createDriver(payload);
            Swal.fire({ icon: 'success', title: 'Sukses!', text: 'Supir ditambahkan', background: '#0f172a', color: '#fff' });
          }
          setIsModalOpen(false);
          await loadDrivers(); 
        } catch (err) {
          Swal.fire({ icon: 'error', title: 'Gagal', text: err.message, background: '#0f172a', color: '#fff' });
        }
      };
  // ─── PEMUAT DATA AWAL (sekali saat mount): daftar supir + dropdown kendaraan tersedia ───
  // Digabung jadi satu effect (sebelumnya ada 3 effect terpisah yang sama-sama memanggil
  // fetchDriverHistory() saat mount, menyebabkan 3x request redundan + race condition).
  useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true);
      try {
        const [driversData, vehicles] = await Promise.all([
          fetchDriverHistory(),
          fetchVehiclesDropdown(),
        ]);

        setDrivers(driversData);
        if (driversData && driversData.length > 0) {
          setSelectedDriver(driversData[0]);
        }

        // Dropdown kendaraan: hanya tampilkan yang belum memiliki supir
        const usedVehicleIds = new Set((driversData || []).map(d => d.vehicle_id).filter(Boolean));
        setVehicleOptions((vehicles || []).filter(v => !usedVehicleIds.has(v.id)));
      } catch (err) {
        setError("Gagal memuat data supir dari server.");
      } finally {
        setIsLoading(false);
      }
    }
    loadInitialData();
  }, []);

  // ─── STATE UNTUK PAGINASI TABEL RlWAYAT ───
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 4; // Batasi maksimal 4 baris saja

  // Reset halaman ke nomor 1 setiap kali admin mengganti supir yang dipilih
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDriver]);

  // ─── LOGIKA PEMOTONGAN DATA (PAGINATION SLICE) ───
  const totalRecords = selectedDriver?.history?.length || 0;
  const totalPages = Math.ceil(totalRecords / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalRecords);

  // Harus didefinisikan sebelum early-return agar urutan Hook konsisten
  const docRef = useRef(null);

  // ─── GUARD EARLY RETURN (setelah semua Hook didefinisikan) ───
  if (isLoading) return <div className="p-8 text-gray-400 flex items-center gap-3"><Zap className="animate-pulse text-emerald-500" /> Memuat profil supir...</div>;
  if (error) return <div className="p-8 text-red-400 bg-red-900/20 rounded-xl m-8 border border-red-800">{error}</div>;
  if (drivers.length === 0) return <div className="p-8 text-gray-500">Belum ada data supir di database.</div>;

  // ─── PRINT LAPORAN ───
  const handlePrintDocs = () => {
    window.print(); // dikombinasikan dengan CSS @media print di bawah
  };


// ─── DOWNLOAD LAPORAN (PDF) ───
// ─── DOWNLOAD LAPORAN (PDF) ───
const handleDownloadDocs = async () => {
  if (!docRef.current) return;

  // 1. Clone node laporan supaya tidak terpengaruh position:fixed / backdrop-blur milik modal
  const original = docRef.current;
  const clone = original.cloneNode(true);

  // Hilangkan tombol aksi (Download/Print/Close) dari hasil clone
  clone.querySelectorAll('.no-print').forEach((el) => el.remove());

  // 2. Taruh clone di container terpisah, di luar viewport (bukan display:none, karena
  //    html2canvas butuh elemen benar-benar dirender/layout, tidak disembunyikan)
  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.top = '0';
  wrapper.style.left = '-9999px';
  wrapper.style.zIndex = '-1';
  wrapper.style.background = '#ffffff';
  wrapper.style.width = `${original.offsetWidth}px`; // jaga lebar sama dengan aslinya
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  try {
    // 3. Tunggu semua gambar (misal logo) selesai load di dalam clone
    await new Promise((resolve) => {
      const imgs = clone.querySelectorAll('img');
      if (imgs.length === 0) return resolve();
      let loaded = 0;
      const done = () => {
        loaded++;
        if (loaded === imgs.length) resolve();
      };
      imgs.forEach((img) => {
        if (img.complete) done();
        else {
          img.onload = done;
          img.onerror = done;
        }
      });
      setTimeout(resolve, 1500); // fallback jaga2
    });

    const canvas = await html2canvas(clone, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
      windowWidth: clone.scrollWidth,
      windowHeight: clone.scrollHeight,
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`Laporan-Trip-${selectedDriver?.name || 'Supir'}-${todayLabel}.pdf`);
  } catch (err) {
    Swal.fire({
      icon: 'error',
      title: 'Gagal Download',
      text: err.message,
      background: '#0f172a',
      color: '#fff',
    });
  } finally {
    document.body.removeChild(wrapper);
  }
};

  // Data inilah yang akan di-render di dalam tag <tbody>
  const currentRows = selectedDriver?.history?.slice(startIndex, endIndex) || [];

  // Cari data live tracking (posisi + jarak tempuh) milik kendaraan supir yang sedang dipilih
  const selectedDriverTruck = liveTrucks.find((t) => t.vehicle_id === selectedDriver?.vehicle_id) || null;

  // (isDocsModalOpen sudah diinisialisasi di atas, mengikuti Rules of Hooks)

  const todayLabel = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const todayTrips = (selectedDriver?.history || []).filter((t) => {
    if (!t?.date) return false;
    // date di backend format: 'DD Mon YYYY, HH24:MI' (lihat main.py)
    // Ambil bagian depan sampai tahun agar robust
    return t.date.startsWith(todayLabel);
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full overflow-y-auto bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 custom-scrollbar">

      {/* ─── HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-wide">Driver Management</h2>
          <div className="text-xs text-emerald-600 dark:text-emerald-500 font-medium flex items-center gap-2 mt-1">
            <span>Fleet Operations</span>
            <span className="text-slate-400 dark:text-slate-600">❯</span>
            <span className="text-emerald-600 dark:text-emerald-400">Driver Profiles</span>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => openAddModal()}
           className="px-4 py-2 bg-emerald-500 text-slate-950 rounded-lg text-sm font-bold hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 self-start">
            <User size={16} /> Add New Driver
          </button>
        </div>
      </div>

      {selectedDriver && (
        <div className="flex flex-col lg:flex-row gap-6 mb-8">
          
          {/* ─── KIRI: PROFIL SUPIR ─── */}
          <div className="w-full lg:w-80 shrink-0 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xl font-bold text-emerald-600 dark:text-emerald-400 shadow-inner">
                    {selectedDriver.name.charAt(0)}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-[#0f172a] rounded-full"></div>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selectedDriver.name}</h3>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Senior Hauler • ID: {selectedDriver.id.replace('DRV-', '')}</p>
                  <div className="flex items-center gap-1 mt-1 text-amber-500 dark:text-amber-400 text-[11px] font-bold">
                    <Star size={12} className="fill-amber-400" /> 4.9 Performance Score
                  </div>
                </div>
              </div>
              {/* ─── PEMBUNGKUS MENU DROPDOWN (Posisikan di sini) ─── */}
                <div className="relative">
                  <button
                    onClick={() => setOpenMenuId(openMenuId === selectedDriver.id ? null : selectedDriver.id)}
                    className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                  >
                    <MoreVertical size={18} />
                  </button>

                  {/* Dropdown Menu muncul dengan posisi absolute relatif terhadap div pembungkus */}
                  {openMenuId === selectedDriver.id && (
                    <>
                      {/* Tambahkan overlay transparan agar menu tertutup saat klik di luar area */}
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setOpenMenuId(null)}
                      ></div>

                      <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-2xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <button
                          onClick={() => { openEditModal(selectedDriver); setOpenMenuId(null); }}
                          className="w-full text-left px-4 py-2 text-xs text-blue-600 dark:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => { handleDelete(selectedDriver.id); setOpenMenuId(null); }}
                          className="w-full text-left px-4 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>

             </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">License Status</p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Active Class B1</p>
              </div>
                <div>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Join Date</p>
                {/* 💡 Mengambil joinDate dari database, atau 'N/A' jika kosong */}
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{selectedDriver.joinDate || 'N/A'}</p>
                </div>
            </div>

            <div className="mb-6">
              <div className="flex justify-between text-xs font-bold mb-2">
                <span className="text-slate-500 dark:text-slate-400">Safety Compliance</span>
                <span className="text-emerald-600 dark:text-emerald-400">98%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div className="w-[98%] h-full bg-emerald-500 rounded-full"></div>
              </div>
            </div>

            <div className="mt-auto">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-3">Active Vehicle</p>
              <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-700/50 rounded-xl p-3 flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Truck size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{selectedDriver?.brand_model || 'N/A'}</p>
                  <p className="text-xs text-slate-500">Plate: <span className="text-slate-700 dark:text-slate-300 font-mono">{selectedDriver?.plate_number || 'N/A'}</span></p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button className="py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors flex items-center justify-center gap-2">
                  <MessageSquare size={14} /> Message
                </button>
                <button
                  onClick={() => setIsDocsModalOpen(true)}
                  className="py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors flex items-center justify-center gap-2"
                >
                  <FileText size={14} /> View Docs
                </button>
              </div>
            </div>
          </div>

          {/* ─── KANAN: STATS & TABEL RIWAYAT ─── */}
          <div className="flex-1 flex flex-col gap-6">
            
            {/* Top Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-md">

  {/* Bagian Header Jarak yang kamu berikan */}


  <div className="flex justify-between items-start text-slate-500 dark:text-slate-400 mb-2">
    <span className="text-sm font-bold">Total Distance</span>
    <Route size={18} className="text-blue-500 dark:text-blue-400" />
  </div>

  {/* Tempat Menampilkan Angka Jarak Tempuh Secara Dinamis */}
  <div className="flex items-baseline gap-1">
    <h3 className="text-2xl font-mono font-bold text-slate-900 dark:text-white">
      {selectedDriverTruck && selectedDriverTruck.traveled_distance
        ? (selectedDriverTruck.traveled_distance / 1000).toFixed(2)
        : "0.00"
      }
    </h3>
    <span className="text-xs font-bold text-slate-500 uppercase">KM</span>
  </div>

  <p className="text-[10px] text-slate-500 mt-1">
    Akumulasi riwayat perjalanan real-time dari alat IoT.
  </p>
</div>

              <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                <div className="flex justify-between items-start text-slate-500 dark:text-slate-400 mb-4">
                  <span className="text-sm font-bold">Total Trips</span>
                  <CheckSquare size={18} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">{totalRecords}</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-2">Completed<br/>No incidents reported</p>
                </div>
              </div>

              <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
                <div className="flex justify-between items-start text-slate-500 dark:text-slate-400 mb-4">
                  <span className="text-sm font-bold">Efficiency Rating</span>
                  <Zap size={18} className="text-amber-500 dark:text-amber-400" />
                </div>
                <div className="mt-auto">
                  <div className="flex items-end gap-2 mb-1">
                    <h4 className="text-3xl font-bold text-slate-900 dark:text-white">A+</h4>
                    <span className="text-xs text-slate-500 dark:text-slate-400 mb-1">Top Tier</span>
                  </div>
                  <div className="flex gap-1 mt-2">
                    {[1, 2, 3, 4].map(i => <div key={i} className="w-3 h-1.5 rounded-full bg-emerald-500"></div>)}
                    <div className="w-3 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Riwayat Angkutan Table */}
            <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg flex-1 flex flex-col overflow-hidden justify-between">
              <div>
                <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Riwayat Angkutan (Transport History)</h3>
                <div className="flex gap-3 text-slate-500 dark:text-slate-400">
                    <button
                      className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                      title="Download"
                      onClick={() => setIsDocsModalOpen(true)}
                    >
                      <Download size={18} />
                    </button>
                    <button
                      className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                      title="Print"
                      onClick={() => setIsDocsModalOpen(true)}
                    >
                      <Printer size={18} />
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto p-2">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">
                      <tr>
                        <th className="px-5 py-4">Trip ID / Time</th>
                        <th className="px-5 py-4">Origin TPH</th>
                        <th className="px-5 py-4">Destination PKS</th>
                        <th className="px-5 py-4">Total Bunches</th>
                        <th className="px-5 py-4">Weight</th>
                        <th className="px-5 py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-700 dark:text-slate-300 text-xs">
                      {currentRows.length === 0 ? (
                        <tr><td colSpan="6" className="text-center py-8 text-slate-500">Belum ada riwayat jalan.</td></tr>
                      ) : (
                        currentRows.map((trip, idx) => {
                          const isPending = trip.status !== 'Selesai';
                          const sequenceNumber = startIndex + idx + 1;
                          return (
                            <tr key={idx} className="border-b border-slate-200/70 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                <td className="px-5 py-4">
                                    {/* 💡 Menampilkan nomor urut (Contoh: #TR-1, #TR-2, dst) */}
                                    <div className="font-mono text-emerald-600 dark:text-emerald-400 font-bold mb-1">
                                    TR-{sequenceNumber}
                                    </div>
                                    <div className="text-[10px] text-slate-500">{trip.date}</div>
                                </td>
                              <td className="px-5 py-4 font-medium">{trip.origin}</td>
                              <td className="px-5 py-4 font-medium">{trip.dest}</td>
                              <td className="px-5 py-4">{trip.janjang} Janjang</td>
                              <td className="px-5 py-4">{trip.weight}</td>
                              <td className="px-5 py-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                                  isPending 
                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                }`}>
                                  {isPending && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>}
                                  {isPending ? 'In Progress' : 'Completed'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ─── PANEL NAVIGASI PAGINASI (BAWAH TABEL) ─── */}
              {totalRecords > 0 && (
                <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/40 text-xs text-slate-500">
                  <div>
                    Showing <span className="text-slate-700 dark:text-slate-300 font-medium">{startIndex + 1}-{endIndex}</span> of <span className="text-slate-700 dark:text-slate-300 font-medium">{totalRecords}</span> historical records
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ─── BAWAH: DAFTAR SEMUA SUPIR ─── */}
      <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex justify-between items-end mb-4">
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Related Fleet Drivers</h3>
          <button className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-500 dark:hover:text-emerald-300">View All Active Drivers</button>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
          {drivers.map((driver) => {

            const isSelected = selectedDriver?.id === driver.id;
            return (
              <button
                key={driver.id}
                onClick={() => setSelectedDriver(driver)}
                className={`flex items-center gap-3 min-w-[220px] p-3 rounded-xl border transition-all text-left group ${
                  isSelected
                    ? 'bg-slate-100 dark:bg-slate-800 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                }`}
              >
                <div className="relative shrink-0">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border ${
                    isSelected ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                  }`}>
                    {driver.name.charAt(0)}
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 border-2 border-white dark:border-slate-900 rounded-full ${
                    driver.status === 'Sedang Jalan' ? 'bg-blue-400' : 'bg-emerald-500'
                  }`}></div>
                </div>
                <div className="overflow-hidden">
                  <h4 className={`text-sm font-bold truncate ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>{driver.name}</h4>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">
                    <span className={driver.status === 'Sedang Jalan' ? 'text-blue-500 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'}>
                      {driver.status === 'Sedang Jalan' ? 'On-Route' : 'Standby'}
                    </span>
                    <span className="mx-1">•</span>
                    ID: {driver.id.split('-')[1]}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      {isDocsModalOpen && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
    <div
      ref={docRef}
      className="print-area bg-[#f8fafc] text-slate-900 border border-slate-200 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6"
    >
      {/* ─── HEADER LAPORAN + LOGO PERUSAHAAN ─── */}
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <h3 className="text-xl font-extrabold">Surat Dokumen Trip Hari Ini</h3>
          <p className="text-xs text-slate-500 mt-1">Generated by Driver Management</p>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          {/* Ganti src di bawah dengan path logo perusahaan Anda */}
          <img
            src="/assets/icone_gpstracking.png"
            alt="Logo Perusahaan"
            className="h-10 object-contain"
          />

          <div className="no-print flex gap-2">
            <button
              onClick={handleDownloadDocs}
              className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-bold flex items-center gap-1"
            >
              <Download size={14} /> Download
            </button>
            <button
              onClick={handlePrintDocs}
              className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-bold flex items-center gap-1"
            >
              <Printer size={14} /> Print
            </button>
            <button
              onClick={() => setIsDocsModalOpen(false)}
              className="px-3 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 text-xs font-bold"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* ─── ISI LAPORAN (tetap seperti sebelumnya) ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <div className="border border-slate-200 rounded-xl p-4 bg-white">
          <p className="text-[11px] uppercase tracking-widest font-bold text-slate-500">Data Supir</p>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between gap-4"><span className="text-sm font-bold">Nama</span><span className="text-sm font-semibold">{selectedDriver?.name || '-'}</span></div>
            <div className="flex justify-between gap-4"><span className="text-sm font-bold">ID</span><span className="text-sm font-semibold">{selectedDriver?.id ? selectedDriver.id.replace('DRV-','') : '-'}</span></div>
            <div className="flex justify-between gap-4"><span className="text-sm font-bold">Join Date</span><span className="text-sm font-semibold">{selectedDriver?.joinDate || 'N/A'}</span></div>
          </div>
        </div>

        <div className="border border-slate-200 rounded-xl p-4 bg-white">
          <p className="text-[11px] uppercase tracking-widest font-bold text-slate-500">Data Kendaraan</p>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between gap-4"><span className="text-sm font-bold">Brand/Model</span><span className="text-sm font-semibold">{selectedDriver?.brand_model || 'Tidak Diketahui'}</span></div>
            <div className="flex justify-between gap-4"><span className="text-sm font-bold">Plate Number</span><span className="text-sm font-semibold">{selectedDriver?.plate_number || 'N/A'}</span></div>
          </div>
        </div>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-widest font-bold text-slate-500">Trip Hari Ini</p>
            <p className="text-sm font-bold">{todayLabel}</p>
          </div>
          <div className="text-sm font-extrabold text-emerald-600">{todayTrips.length} trip</div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-slate-500 bg-white">
              <tr>
                <th className="px-4 py-3">Trip ID</th>
                <th className="px-4 py-3">Waktu</th>
                <th className="px-4 py-3">Origin</th>
                <th className="px-4 py-3">Destination</th>
                <th className="px-4 py-3">Janjang</th>
                <th className="px-4 py-3">Weight</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {todayTrips.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-500">Belum ada trip hari ini.</td>
                </tr>
              ) : (
                todayTrips.map((trip, idx) => {
                  const isPending = trip.status !== 'Selesai';
                  return (
                    <tr key={idx} className="border-t border-slate-200">
                      <td className="px-4 py-3 font-bold">TRP-{idx + 1}</td>
                      <td className="px-4 py-3 text-slate-700">{trip.date}</td>
                      <td className="px-4 py-3 text-slate-700">{trip.origin}</td>
                      <td className="px-4 py-3 text-slate-700">{trip.dest}</td>
                      <td className="px-4 py-3 text-slate-700">{trip.janjang}</td>
                      <td className="px-4 py-3 text-slate-700">{trip.weight}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold border ${
                            isPending
                              ? 'bg-blue-500/10 text-blue-600 border-blue-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          }`}
                        >
                          {isPending ? 'In Progress' : 'Completed'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
)}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto p-6">
            <h3 className="text-lg font-bold mb-4 dark:text-white">
              {isEditing ? 'Edit Supir' : 'Tambah Supir Baru'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-slate-300">Nama Supir</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-slate-300">Username</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-slate-300">Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!isEditing} // Password wajib diisi saat menambah supir baru
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 dark:text-slate-300">Kendaraan (Truk)</label>
                <select
                  name="vehicle_id"
                  value={formData.vehicle_id || ''} // Gunakan string kosong jika null
                  onChange={(e) => setFormData({ ...formData, vehicle_id: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  {/* Opsi default jika supir belum memiliki kendaraan */}
                  <option value="">-- Pilih Kendaraan (Kosongkan jika tidak ada) --</option>
                  
                  {/* Looping data dari database */}
                  {vehicleOptions.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.plate_number} - {vehicle.brand_model}
                    </option>
                  ))}
                </select>
              </div>
               <div>
                <label className="block text-sm font-medium mb-1 dark:text-slate-300">Status</label>
                <select
                  name="status"
                  value={formData.status || 'Standby'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
               >
                  <option value="Standby">Standby</option>
                  <option value="Sedang Jalan">Sedang Jalan</option>
                  <option value="Inactive">Inactive</option>
                </select>
                </div>

              
              <div className="flex gap-2 justify-end mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-500">Batal</button>
                <button type="submit" className="px-4 py-2 bg-emerald-500 rounded text-slate-950 font-bold">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
    
  );
}
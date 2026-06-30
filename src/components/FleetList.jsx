// ============================================================
// components/FleetList.jsx
// ============================================================
import React, { useState, useEffect } from 'react';
import { fetchFleetStatus, createFleet, updateFleet, deleteFleet } from '../services/api'; 
import { Truck, Zap, Plus, Edit, Trash2, X } from 'lucide-react';
import Swal from 'sweetalert2';

export default function FleetList() {
  const [vehicles, setVehicles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // State untuk Modal CRUD
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  
  // State untuk Form Input
  const [formData, setFormData] = useState({
    plate: '',
    brand_model: '',
    capacity: ''
  });

  const loadFleet = async () => {
    setIsLoading(true);
    try {
      const data = await fetchFleetStatus();
      setVehicles(data);
    } catch (err) {
      setError("Gagal memuat data armada.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFleet();
  }, []);

  // ─── LOGIKA CRUD ──────────────────────────────────────────

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const openAddModal = () => {
    setIsEditing(false);
    setFormData({ plate: '', brand_model: '', capacity: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (fleet) => {
    setIsEditing(true);
    setCurrentId(fleet.id);
    setFormData({
      plate: fleet.plate,
      brand_model: fleet.brand_model,
      capacity: fleet.capacity
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
     if (isEditing) {
      await updateFleet(currentId, formData);
      Swal.fire({
          icon: 'success',
          title: 'Berhasil!',
          text: 'Data armada telah diperbarui.',
          confirmButtonColor: '#10b981', // Emerald 500
          background: '#0f172a', // Sesuai tema gelapmu
          color: '#fff'
        });
      } else {
        await createFleet(formData);
        Swal.fire({
          icon: 'success',
          title: 'Armada Ditambahkan!',
          text: 'Data armada baru berhasil tersimpan.',
          confirmButtonColor: '#10b981',
          background: '#0f172a',
          color: '#fff'
        });
      }
      setIsModalOpen(false);
      loadFleet();
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: 'Terjadi kesalahan sistem.',
        background: '#0f172a',
        color: '#fff'
      });
    }
  };

    const handleDelete = async (id) => {
        // Gunakan toast.promise agar lebih keren saat proses hapus
const result = await Swal.fire({
      title: 'Apakah Anda yakin?',
      text: "Data yang dihapus tidak dapat dikembalikan!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Ya, Hapus!',
      background: '#0f172a',
      color: '#fff'
    });

    if (result.isConfirmed) {
      try {
        await deleteFleet(id);
        Swal.fire({
          title: 'Terhapus!',
          text: 'Data armada telah dihapus.',
          icon: 'success',
          background: '#0f172a',
          color: '#fff'
        });
        loadFleet();
      } catch (err) {
        Swal.fire('Error', 'Gagal menghapus data.', 'error');
      }
    }
  };

  // ──────────────────────────────────────────────────────────

  if (isLoading && vehicles.length === 0) return <div className="p-8 text-slate-500 flex items-center gap-2"><Zap className="animate-pulse" /> Memuat data armada...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;

  return (
    <div className="p-8 h-full overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-colors">
      
      {/* HEADER & TOMBOL ADD */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-gray-100">Daftar Armada Truk</h2>
          <p className="text-slate-500 dark:text-gray-400 text-sm mt-1">Monitoring status operasional dan manajemen armada.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold shadow-md transition-colors"
        >
          <Plus size={18} /> Tambah Armada
        </button>
      </div>

      {/* GRID KARTU ARMADA */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map((fleet) => (
          <div key={fleet.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-emerald-500/50 transition-colors shadow-md dark:shadow-lg relative overflow-hidden group">
            
            <div className={`absolute top-0 left-0 w-full h-1 ${fleet.status !== 'IDLE' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>

            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-gray-100 tracking-wide">{fleet.plate}</h3>
                <p className="text-xs text-slate-500 dark:text-gray-500 mt-1">Supir: {fleet.driver}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 flex items-center justify-center text-xl">
                <Truck size={20} className="text-slate-700 dark:text-white" />
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 rounded-xl mb-4 transition-colors">
              <p className="text-emerald-600 dark:text-emerald-400 font-bold text-lg truncate">{fleet.brand_model}</p>
              <div className="flex gap-4 text-xs text-slate-500 dark:text-slate-400 mt-2">
                <span>Kapasitas: <b className="text-slate-800 dark:text-white">{fleet.capacity} Ton</b></span>
                <span>Status: <b className="text-slate-800 dark:text-white">{fleet.status}</b></span>
              </div>
            </div>

            {/* ACTION BUTTONS (EDIT & DELETE) */}
            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-gray-800/80 flex justify-between items-center">
              <span className={`text-xs font-bold ${fleet.status !== 'IDLE' ? 'text-emerald-600 dark:text-emerald-500' : 'text-amber-600 dark:text-amber-500'}`}>
                {fleet.status}
              </span>
              
              <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEditModal(fleet)} className="text-blue-500 hover:text-blue-400 transition-colors p-1" title="Edit Armada">
                  <Edit size={16} />
                </button>
                <button onClick={() => handleDelete(fleet.id)} className="text-red-500 hover:text-red-400 transition-colors p-1" title="Hapus Armada">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ─── MODAL FORM ─── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transition-colors">
            <div className="flex justify-between items-center p-5 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {isEditing ? 'Edit Data Armada' : 'Tambah Armada Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-slate-800 dark:hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Pelat Nomor</label>
                <input 
                  type="text" name="plate" required
                  value={formData.plate} onChange={handleInputChange}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  placeholder="Misal: BM 1234 XX"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Merek & Model</label>
                <input 
                  type="text" name="brand_model" required
                  value={formData.brand_model} onChange={handleInputChange}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  placeholder="Misal: Hino 500 FG"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Kapasitas (Ton)</label>
                <input 
                  type="number" name="capacity" step="0.1" required
                  value={formData.capacity} onChange={handleInputChange}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  placeholder="Misal: 12.5"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                  Batal
                </button>
                <button type="submit" className="px-6 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-md transition-colors">
                  Simpan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
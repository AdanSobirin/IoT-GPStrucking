// ============================================================
// components/LocationManagement.jsx
// ============================================================
import React, { useState, useEffect } from 'react';
import { fetchLocations, createLocation, updateLocation, deleteLocation } from '../services/api';
import { MapPin, Factory, Plus, Edit, Trash2, Zap, CheckCircle } from 'lucide-react';
import Swal from 'sweetalert2';

// Import komponen React Leaflet
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix untuk masalah ikon default Leaflet di React
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

// ─── KOMPONEN BANTUAN UNTUK KLIK PETA ───
// Komponen ini akan menangkap event klik pada peta dan mengupdate state formData
function MapClickHandler({ setFormData }) {
  useMapEvents({
    click(e) {
      setFormData(prev => ({
        ...prev,
        lat: e.latlng.lat,
        lng: e.latlng.lng
      }));
    },
  });
  return null;
}

export default function LocationManagement() {
  const [locations, setLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // State Modal Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  
  // Default koordinat (bisa disesuaikan ke area perkebunan, misal Riau)
  const defaultCenter = [0.5, 101.5]; 

  const [formData, setFormData] = useState({
    name: '',
    type: 'tph',
    lat: '',
    lng: ''
  });

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchLocations();
      setLocations(data);
    } catch (err) {
      setError("Gagal memuat data lokasi.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddModal = () => {
    setIsEditing(false);
    setFormData({ name: '', type: 'tph', lat: '', lng: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (loc) => {
    setIsEditing(true);
    setCurrentId(loc.id);
    setFormData({
      name: loc.name,
      type: loc.type,
      lat: loc.lat,
      lng: loc.lng
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    const confirm = await Swal.fire({
      title: 'Hapus Lokasi?',
      text: "Data yang dihapus tidak dapat dikembalikan!",
      icon: 'warning',
      showCancelButton: true,
      background: '#0f172a',
      color: '#fff',
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Ya, Hapus!'
    });

    if (confirm.isConfirmed) {
      try {
        await deleteLocation(id);
        Swal.fire({ icon: 'success', title: 'Terhapus!', text: 'Lokasi berhasil dihapus.', background: '#0f172a', color: '#fff' });
        loadData();
      } catch (err) {
        Swal.fire({ icon: 'error', title: 'Gagal', text: err.message, background: '#0f172a', color: '#fff' });
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.lat || !formData.lng) {
      Swal.fire({ icon: 'warning', title: 'Koordinat Kosong', text: 'Silakan klik titik lokasi pada peta.', background: '#0f172a', color: '#fff' });
      return;
    }

    const payload = {
      name: formData.name,
      type: formData.type,
      lat: parseFloat(formData.lat),
      lng: parseFloat(formData.lng)
    };

    try {
      if (isEditing) {
        await updateLocation(currentId, payload);
        Swal.fire({ icon: 'success', title: 'Sukses', text: 'Data lokasi diperbarui.', background: '#0f172a', color: '#fff' });
      } else {
        await createLocation(payload);
        Swal.fire({ icon: 'success', title: 'Sukses', text: 'Lokasi baru ditambahkan.', background: '#0f172a', color: '#fff' });
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: err.message, background: '#0f172a', color: '#fff' });
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full overflow-y-auto bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-200 custom-scrollbar">

      {/* ─── HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 sm:mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Manajemen Lokasi</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Kelola titik TPH dan Pabrik Kelapa Sawit (PKS).</p>
        </div>
        <button
          onClick={openAddModal}
          className="px-5 py-2.5 bg-emerald-500 text-slate-950 rounded-lg text-sm font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2 self-start sm:self-auto"
        >
          <Plus size={18} /> Tambah Lokasi
        </button>
      </div>

      {/* ─── KONTEN TABEL ─── */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400"><Zap className="animate-pulse text-emerald-500" /> Memuat data lokasi...</div>
      ) : error ? (
        <div className="p-4 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg">{error}</div>
      ) : (
        <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="text-[11px] text-slate-500 uppercase tracking-wider font-bold bg-slate-100/70 dark:bg-slate-900/50">
                <tr>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Nama Lokasi</th>
                  <th className="px-6 py-4">Tipe</th>
                  <th className="px-6 py-4">Koordinat (Lat, Lng)</th>
                  <th className="px-6 py-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="text-slate-700 dark:text-slate-300 text-xs">
                {locations.length === 0 ? (
                  <tr><td colSpan="5" className="text-center py-8 text-slate-500">Belum ada data lokasi.</td></tr>
                ) : (
                  locations.map((loc) => (
                    <tr key={loc.id} className="border-b border-slate-200/70 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 font-mono text-slate-500">LOC-{loc.id}</td>
                      <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{loc.name}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          loc.type === 'pks' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        }`}>
                          {loc.type === 'pks' ? <Factory size={12} /> : <MapPin size={12} />}
                          {loc.type === 'pks' ? 'Pabrik PKS' : 'TPH'}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-slate-500 dark:text-slate-400">
                        {loc.lat.toFixed(6)}, {loc.lng.toFixed(6)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => openEditModal(loc)} className="p-2 text-blue-600 dark:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors mr-2">
                          <Edit size={16} />
                        </button>
                        <button onClick={() => handleDelete(loc.id)} className="p-2 text-red-600 dark:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── MODAL FORM DENGAN PETA ─── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col">

            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <MapPin className="text-emerald-500" /> {isEditing ? 'Edit Lokasi' : 'Tambah Lokasi Baru'}
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 flex flex-col gap-6">

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-600 dark:text-slate-300">Nama Lokasi</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="Misal: TPH-01 / PKS Inti"
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-slate-600 dark:text-slate-300">Tipe Lokasi</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 text-slate-900 dark:text-white"
                  >
                    <option value="tph">TPH (Tempat Pemungutan Hasil)</option>
                    <option value="pks">Pabrik PKS</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1">
                  <CheckCircle size={14} /> Klik pada peta untuk menentukan koordinat
                </p>

                {/* WADAH PETA */}
                <div className="h-[250px] w-full rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 mb-4 z-0">
                  <MapContainer 
                    center={formData.lat && formData.lng ? [formData.lat, formData.lng] : defaultCenter} 
                    zoom={12} 
                    style={{ height: "100%", width: "100%" }}
                  >
                    <TileLayer
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                      attribution='Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community'
                      maxZoom={19}
                    />
                    <TileLayer
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                      attribution=""
                      maxZoom={19}
                    />
                    <MapClickHandler setFormData={setFormData} />
                    
                    {/* Tampilkan Marker jika koordinat sudah ada */}
                    {formData.lat && formData.lng && (
                      <Marker position={[formData.lat, formData.lng]} />
                    )}
                  </MapContainer>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1 text-slate-500 uppercase">Latitude</label>
                    <input
                      type="text"
                      readOnly
                      value={formData.lat}
                      placeholder="Terisi otomatis..."
                      className="w-full px-3 py-2 border rounded-lg bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-slate-500 uppercase">Longitude</label>
                    <input
                      type="text"
                      readOnly
                      value={formData.lng}
                      placeholder="Terisi otomatis..."
                      className="w-full px-3 py-2 border rounded-lg bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-sm text-slate-500 dark:text-slate-400 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                  Batal
                </button>
                <button type="submit" className="px-5 py-2.5 text-sm font-bold text-slate-950 bg-emerald-500 rounded-lg hover:bg-emerald-400 transition-colors">
                  Simpan Lokasi
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
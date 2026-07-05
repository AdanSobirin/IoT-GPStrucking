// ============================================================
// components/ApprovalCenter.jsx
// ============================================================
import React, { useState, useEffect } from 'react';
import { fetchApprovalQueue, approveDelivery, fetchApprovalHistory } from '../services/api';
import { Package, MapPin, Clock, Hash, CheckCircle, XCircle, Image as ImageIcon, Zap, History, ListChecks } from 'lucide-react';
import Swal from 'sweetalert2';

const PHP_SERVER_URL = "https://kamangmakmur.online"; // Ganti dengan URL server PHP-mu

export default function ApprovalCenter() {
  const [activeTab, setActiveTab] = useState('queue'); 
  const [queue, setQueue] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedReq, setSelectedReq] = useState(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (activeTab === 'queue') {
        const data = await fetchApprovalQueue();
        setQueue(data);
      } else {
        const data = await fetchApprovalHistory();
        setHistory(data);
      }
    } catch (error) {
      console.error("Gagal memuat data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    let interval;
    if (activeTab === 'queue') {
      interval = setInterval(loadData, 10000);
    }
    return () => clearInterval(interval);
  }, [activeTab]);

  const handleApprove = async (transactionId, vehicleId) => {
    setIsProcessing(true);
    try {
      await approveDelivery({
        transaction_id: Number(transactionId),
        vehicle_id: Number(vehicleId),
      });

      Swal.fire({
        icon: 'success',
        title: 'Berhasil',
        text: 'Muatan PKS telah disetujui.',
        confirmButtonColor: '#10b981',
        background: '#0f172a', // Sesuai tema gelapmu
        color: '#fff'
      });
      setSelectedReq(null);
      loadData();
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: 'Terjadi kesalahan sistem.',
        confirmButtonColor: '#ef4444',
        background: '#0f172a', // Sesuai tema gelapmu
        color: '#fff'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-8 h-full overflow-y-auto bg-gray-50 text-slate-900 dark:bg-slate-950 dark:text-slate-200 custom-scrollbar">

      
      {/* ─── HEADER ─── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-bold text-white">Verifikasi Muatan PKS</h2>
          <p className="text-slate-400 text-sm mt-1">Otorisasi bongkar muat dan riwayat Tandan Buah Segar (TBS).</p>
        </div>

      <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1">

          <button 
            onClick={() => setActiveTab('queue')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'queue' ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white shadow-md' : 'text-slate-600 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
            }`}

          >
            <ListChecks size={16} /> Antrean
            {activeTab === 'queue' && queue.length > 0 && (
              <span className="ml-2 w-5 h-5 flex items-center justify-center bg-amber-500 text-slate-950 rounded-full text-[10px]">
                {queue.length}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'history' ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white shadow-md' : 'text-slate-600 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
            }`}

          >
            <History size={16} /> Riwayat
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-slate-400"><Zap className="animate-pulse" /> Memuat data...</div>
      ) : activeTab === 'queue' ? (
        
        /* ─── TAB: ANTREAN ─── */
        queue.length === 0 ? (
          <div className="p-12 text-center border border-slate-200 dark:border-slate-800 border-dashed rounded-2xl bg-white/60 dark:bg-slate-900/30 mt-4">

            <CheckCircle size={48} className="mx-auto text-emerald-500/50 mb-4" />
            <p className="text-slate-400 font-medium">Tidak ada antrean truk saat ini.<br/>Semua muatan telah diverifikasi.</p>
          </div>
        ) : (
          <div className="space-y-4 max-w-4xl mt-4">
            {queue.map((req) => (
              <div 
                key={req.id} 
                onClick={() => setSelectedReq(req)}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-emerald-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/80 cursor-pointer transition-all group shadow-sm"

              >
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-emerald-500/10 dark:bg-slate-950 border border-emerald-500/20 dark:border-slate-800 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-inner group-hover:scale-110 transition-transform">

                    <Package size={28} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {req.driver} <span className="text-slate-600 mx-2">•</span> <span className="font-mono text-emerald-400">{req.plate}</span>
                    </h3>
                    <div className="flex gap-4 mt-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><Clock size={12}/> {req.time}</span>
                      <span className="flex items-center gap-1"><MapPin size={12}/> TPH: {req.tph}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-6 text-center bg-slate-100/70 dark:bg-slate-950 px-6 py-3 rounded-xl border border-slate-200/70 dark:border-slate-800/50">

                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">Janjang</p>
                    <p className="text-lg font-bold text-slate-200">{req.janjang}</p>
                  </div>
                  <div className="w-px bg-slate-800"></div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">Aksi</p>
                    <p className="text-xs font-bold text-emerald-400 mt-1">Review ➔</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (

        /* ─── TAB: RIWAYAT ─── */
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-lg mt-4 overflow-hidden">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50">
            <h3 className="text-base font-bold text-slate-100">Log Approval Muatan</h3>
          </div>
          <div className="overflow-x-auto p-2">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">
                <tr>
                  <th className="px-5 py-4">ID Transaksi / Waktu</th>
                  <th className="px-5 py-4">Supir & Armada</th>
                  <th className="px-5 py-4">Asal TPH</th>
                  <th className="px-5 py-4">Total Janjang</th>
                  <th className="px-5 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="text-slate-300 text-xs">
                {history.length === 0 ? (
                  <tr><td colSpan="5" className="text-center py-8 text-slate-500">Belum ada riwayat approval.</td></tr>
                ) : (
                  history.map((item) => (
                    <tr 
                      key={item.id} 
                      onClick={() => setSelectedReq(item)} // 💡 Dibuat bisa diklik
                      className="border-b border-slate-800/50 hover:bg-slate-800/80 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="font-mono text-emerald-400 font-bold mb-1">APP-{item.id}</div>
                        <div className="text-[10px] text-slate-500">{item.time}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-200 mb-1">{item.driver}</div>
                        <div className="font-mono text-[10px] text-slate-500">{item.plate}</div>
                      </td>
                      <td className="px-5 py-4 font-medium">{item.tph} (Blok {item.blok})</td>
                      <td className="px-5 py-4 font-bold text-amber-400">{item.janjang}</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle size={10} /> Disetujui
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── MODAL DETAIL FOTO ─── */}
      {selectedReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="flex justify-between items-center p-5 border-b border-slate-800 bg-slate-950/50">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CheckCircle className="text-emerald-500" /> Detail Verifikasi Muatan
              </h3>
              <button onClick={() => setSelectedReq(null)} className="text-slate-400 hover:text-white transition-colors">
                <XCircle size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-500 font-bold uppercase mb-1">Informasi Supir</p>
                  <p className="text-base font-bold text-white">{selectedReq.driver}</p>
                  <p className="text-sm text-emerald-400 font-mono">{selectedReq.plate}</p>
                </div>
                <div className="w-full h-px bg-slate-800"></div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><MapPin size={12}/> TPH Asal</p>
                    <p className="font-bold text-slate-200">{selectedReq.tph}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Hash size={12}/> Blok</p>
                    <p className="font-bold text-slate-200">{selectedReq.blok}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Package size={12}/> Jumlah Janjang</p>
                    <p className="text-xl font-bold text-amber-400">{selectedReq.janjang}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Clock size={12}/> {activeTab === 'queue' ? 'Waktu Diterima' : 'Waktu Disetujui'}</p>
                    <p className="font-bold text-slate-200 text-xs">{selectedReq.time}</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 rounded-xl border border-slate-800 flex flex-col items-center justify-center p-2 min-h-[250px] relative overflow-hidden">
                {selectedReq.photo ? (
                  <img 
                    src={`${PHP_SERVER_URL}/${selectedReq.photo}`} 
                    alt="Bukti Sawit" 
                    className="w-full h-full object-contain rounded-lg"
                    onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.com/300x400?text=Foto+Tidak+Ditemukan"; }}
                  />
                ) : (
                  <div className="text-slate-600 flex flex-col items-center">
                    <ImageIcon size={48} className="mb-2 opacity-50" />
                    <p className="text-xs font-bold">Tidak ada foto terlampir</p>
                  </div>
                )}
              </div>

            </div>

            {/* ─── MODAL FOOTER ─── */}
            <div className="p-5 border-t border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/50 flex justify-end gap-3 items-center">
              <button 
                onClick={() => setSelectedReq(null)}
                className="px-5 py-2.5 text-sm font-bold text-slate-300 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors"
              >
                Tutup
              </button>
              
              {/* 💡 Kondisi: Tombol Approve hanya muncul jika dari tab Antrean */}
              {activeTab === 'queue' ? (
                <button 
                  onClick={() => handleApprove(selectedReq.id, selectedReq.vehicle_id)}
                  disabled={isProcessing}
                  className="px-6 py-2.5 text-sm font-bold text-slate-950 bg-emerald-500 rounded-lg shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isProcessing ? <Zap className="animate-pulse" size={16} /> : <CheckCircle size={16} />}
                  {isProcessing ? "Memproses..." : "Approve Muatan PKS"}
                </button>
              ) : (
                <div className="px-6 py-2.5 text-sm font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center gap-2 cursor-default">
                  <CheckCircle size={16} /> Telah Disetujui
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
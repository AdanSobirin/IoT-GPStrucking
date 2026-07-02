import React, { useState } from 'react';
import { Lock, User, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom'; 
import { loginAdmin } from '../services/api'; // Pastikan path benar
import Swal from 'sweetalert2';

export default function Login() {
  const navigate = useNavigate(); // Pindahkan ke dalam komponen
  
  const [showVideo, setShowVideo] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);

  const handleVideoEnd = () => setShowVideo(false);

  // FUNGSI HANDLE LOGIN YANG BENAR
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');
    
    try {
      // Panggil fungsi dari api.js
      await loginAdmin({ 
        username: formData.username, 
        password: formData.password 
      });

      // Jika berhasil
     await Swal.fire({
      icon: 'success',
      title: 'Login Berhasil',
      text: 'Selamat datang kembali, Admin!',
      background: '#0f172a', // Warna gelap senada dengan tema
      color: '#fff',
      confirmButtonColor: '#10b981', // Emerald 500
      timer: 2000,
      timerProgressBar: true,
      showConfirmButton: false
    });

    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('adminName', formData.username);
    navigate('/dashboard');

  } catch (error) {
    // ─── TAMBAHKAN POPUP ERROR DI SINI (Opsional tapi disarankan) ───
    Swal.fire({
      icon: 'error',
      title: 'Login Gagal',
      text: error.message || "Username atau password salah!",
      background: '#0f172a',
      color: '#fff',
      confirmButtonColor: '#ef4444'
    });
    setErrorMessage(error.message);
  } finally {
    setIsLoading(false);
  }
};

  // ─── TAMPILAN 1: VIDEO ───
  if (showVideo) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex items-center justify-center z-50 overflow-hidden">
        <video 
          src="/assets/loading_screen.mp4" 
          autoPlay 
          muted 
          playsInline 
          onEnded={handleVideoEnd}
          className="w-full h-full object-cover opacity-80"
        />
        <button 
          onClick={() => setShowVideo(false)}
          className="absolute bottom-10 right-10 text-white/50 hover:text-white text-sm font-medium tracking-widest uppercase transition-colors"
        >
          Lewati Intro
        </button>
      </div>
    );
  }

  // ─── TAMPILAN 2: FORM LOGIN ───
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      {/* Background Ornaments */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-10">
           <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center mb-4 shadow-inner overflow-hidden">
              <img src="/assets/icone_gpstracking.png" alt="Logo" className="w-full h-full object-cover" />
           </div>
           <h1 className="text-2xl font-bold text-white tracking-wide">TrukSawit GPS</h1>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
            {errorMessage && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-xs font-bold p-3 rounded-xl text-center">
                    {errorMessage}
                </div>
            )}
            
            {/* Input Username & Password sama seperti kodinganmu sebelumnya */}
            <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Username</label>
                <input 
                    type="text" required
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-white" 
                />
            </div>
            
            <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Password</label>
                <input 
                    type="password" required
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 p-3.5 rounded-xl text-white" 
                />
            </div>

            <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-emerald-500 p-3.5 rounded-xl font-bold text-slate-950"
            >
                {isLoading ? "Memproses..." : "Masuk ke Dashboard"}
            </button>
        </form>
      </div>
    </div>
  );
}
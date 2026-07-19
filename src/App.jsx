import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Monitor, LogOut, CheckCircle, AlertTriangle, ChevronLeft, ChevronRight, HelpCircle, BookOpen, PlusCircle, Trash2, ClipboardList, LayoutDashboard, Users, UserCog, Book, FileSpreadsheet, Activity, Download, Timer, BarChart, RefreshCcw, Edit, ArrowLeft, Info, Award, ThumbsUp, Flame, PlayCircle, Eye } from 'lucide-react';
import { supabase } from './supabaseClient';
import logoSekolah from './assets/logo.png';

// =========================================================================
// --- DASHBOARD TERPADU (ADMIN, GURU, & PENGAWAS) ---
// =========================================================================
const DashboardView = ({ currentUser }) => {
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'proktor';
  const isGuru = currentUser?.role === 'guru';
  const isPengawas = currentUser?.role === 'pengawas';

  const [activeTab, setActiveTab] = useState(isAdmin ? 'ruangan' : (isGuru ? 'soal' : 'monitoring'));

  // --- STATE DATA ---
  const [semuaRuangan, setSemuaRuangan] = useState([]);
  const [daftarGuru, setDaftarGuru] = useState([]);
  const [daftarSiswa, setDaftarSiswa] = useState([]);
  const [daftarMapel, setDaftarMapel] = useState([]);
  const [daftarPaket, setDaftarPaket] = useState([]);
  const [daftarSoal, setDaftarSoal] = useState([]);
  const [rekapNilai, setRekapNilai] = useState([]);
  const [analisisSoal, setAnalisisSoal] = useState([]);
  
  // STATE MONITORING BARU
  const [logPelanggaran, setLogPelanggaran] = useState([]);
  const [aktivitasSiswa, setAktivitasSiswa] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  // --- VIEW STATE UNTUK BANK SOAL ---
  const [viewPaket, setViewPaket] = useState('list');
  const [selectedPaket, setSelectedPaket] = useState(null);

  // --- STATE FORM ---
  const [formRuangan, setFormRuangan] = useState({ nama: '' });
  const [formUser, setFormUser] = useState({ nisn: '', nama: '', role: 'guru' });
  const [formSiswa, setFormSiswa] = useState({ nisn: '', nama: '', kelas: '' });
  const [formMapel, setFormMapel] = useState({ nama: '' });
  const [formPaket, setFormPaket] = useState({ mapel_id: '', kelas_jurusan: '' });
  const [formSoal, setFormSoal] = useState({ teks: '', a: '', b: '', c: '', d: '', kunci: 'A', bobot: 10, status: 'publish' });
  const [selectedImage, setSelectedImage] = useState(null);

  // --- FILTER ---
  const [filterKelasNilai, setFilterKelasNilai] = useState('');
  const [filterMapelNilai, setFilterMapelNilai] = useState('');

  useEffect(() => { fetchData(true); }, [activeTab]);

  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    
    if (activeTab === 'ruangan' || activeTab === 'user') {
      const { data: dRuangan } = await supabase.from('ruangan').select(`*, sesi_ujian (id, token_ujian, status, pengawas_id, mapel_id, paket_id, durasi_menit)`);
      const { data: dGuru } = await supabase.from('users').select('*').in('role', ['guru', 'pengawas', 'admin']);
      if (dRuangan) setSemuaRuangan(dRuangan);
      if (dGuru) setDaftarGuru(dGuru);
    }

    const { data: dMapel } = await supabase.from('mata_pelajaran').select('*');
    if (dMapel) setDaftarMapel(dMapel);

    if (activeTab === 'siswa' || activeTab === 'soal') {
      const { data } = await supabase.from('users').select('*').eq('role', 'siswa');
      if (data) setDaftarSiswa(data);
    }

    if (activeTab === 'soal' || activeTab === 'ruangan') {
      const { data: dPaket } = await supabase.from('paket_ujian').select('*, mata_pelajaran(nama_mapel)').order('id', { ascending: false });
      const { data: dSoal } = await supabase.from('soal').select('id, paket_id, teks_pertanyaan, gambar_url, opsi_a, opsi_b, opsi_c, opsi_d, kunci_jawaban, bobot_nilai, status').order('id', { ascending: false });
      if (dPaket) setDaftarPaket(dPaket);
      if (dSoal) setDaftarSoal(dSoal);
    }

    if (activeTab === 'nilai') {
      const { data } = await supabase.from('jawaban_siswa').select(`id, jawaban_dipilih, users (id, nisn_nip, nama_lengkap, kelas), soal (kunci_jawaban, bobot_nilai, mapel_id, mata_pelajaran(nama_mapel))`);
      if (data) {
        const grupSiswa = {};
        data.forEach(item => {
          if (!item.users || !item.soal) return;
          const mapelNama = item.soal.mata_pelajaran?.nama_mapel || 'Tanpa Mapel';
          const key = `${item.users.nisn_nip}_${item.soal.mapel_id}`;
          if (!grupSiswa[key]) grupSiswa[key] = { siswa_id: item.users.id, nisn: item.users.nisn_nip, nama: item.users.nama_lengkap, kelas: item.users.kelas, mapel: mapelNama, nilai: 0 };
          if (item.jawaban_dipilih === item.soal.kunci_jawaban) grupSiswa[key].nilai += item.soal.bobot_nilai;
        });
        setRekapNilai(Object.values(grupSiswa));
      }
    }

    if (activeTab === 'analisis') {
      const { data: dSoal } = await supabase.from('soal').select('id, teks_pertanyaan, kunci_jawaban, mata_pelajaran(nama_mapel)');
      const { data: dJawab } = await supabase.from('jawaban_siswa').select('soal_id, jawaban_dipilih');
      if (dSoal && dJawab) {
        const stats = dSoal.map(s => {
          const answers = dJawab.filter(j => j.soal_id === s.id);
          const correct = answers.filter(j => j.jawaban_dipilih === s.kunci_jawaban).length;
          const total = answers.length;
          return { id: s.id, mapel: s.mata_pelajaran?.nama_mapel || 'Unknown', teks: s.teks_pertanyaan.substring(0, 50) + '...', benar: correct, salah: total - correct, total: total, persentase: total === 0 ? 0 : Math.round((correct / total) * 100) };
        });
        setAnalisisSoal(stats);
      }
    }

    // --- FETCH LIVE MONITORING & LOG PELANGGARAN ---
    if (activeTab === 'monitoring') {
      let queryLog = supabase.from('log_pelanggaran').select(`id, waktu, keterangan, users (nama_lengkap, kelas), sesi_ujian (pengawas_id, ruangan(nama_ruangan))`).order('waktu', { ascending: false });
      let queryAkt = supabase.from('aktivitas_ujian').select(`id, status, waktu_mulai, users (nama_lengkap, kelas), sesi_ujian (pengawas_id, ruangan(nama_ruangan))`).order('waktu_mulai', { ascending: false });
      
      if (!isAdmin) {
         // Jika bukan admin, hanya ambil data dari ruangan yang diawasi oleh akun ini
         queryLog = queryLog.eq('sesi_ujian.pengawas_id', currentUser.id);
         queryAkt = queryAkt.eq('sesi_ujian.pengawas_id', currentUser.id);
      }

      const [resLog, resAkt] = await Promise.all([queryLog, queryAkt]);
      
      // Filter null relation jika RLS/Inner join supabase bertingkah
      if (resLog.data) setLogPelanggaran(resLog.data.filter(d => isAdmin || d.sesi_ujian !== null));
      if (resAkt.data) setAktivitasSiswa(resAkt.data.filter(d => isAdmin || d.sesi_ujian !== null));
    }
    
    if (showLoading) setLoading(false);
  };

  const handleTambahRuangan = async (e) => {
    e.preventDefault();
    await supabase.from('ruangan').insert([{ nama_ruangan: formRuangan.nama }]);
    setFormRuangan({ nama: '' }); fetchData(true);
  };

  const assignAtributSesi = async (ruanganId, sesiId, field, value) => {
    if (!sesiId) await supabase.from('sesi_ujian').insert({ ruangan_id: ruanganId, [field]: value, status: 'belum_mulai', durasi_menit: 90 });
    else await supabase.from('sesi_ujian').update({ [field]: value }).eq('id', sesiId);
    fetchData(false);
  };

  const generateToken = async (ruanganId, sesiId) => {
    const token = Math.random().toString(36).substring(2, 8).toUpperCase();
    assignAtributSesi(ruanganId, sesiId, 'token_ujian', token);
  };

  const toggleStatus = async (ruanganId, sesiId, statusAktif, paketAktif) => {
    if (!sesiId) { alert("Generate Token dulu!"); return; }
    if (!paketAktif && statusAktif !== 'berjalan') { alert("Pilih Data Ujian (Paket Soal) terlebih dahulu!"); return; }
    const statusBaru = statusAktif === 'berjalan' ? 'belum_mulai' : 'berjalan';
    await supabase.from('sesi_ujian').update({ status: statusBaru }).eq('id', sesiId);
    fetchData(false);
  };

  const hapusData = async (tabel, id) => {
    if (!window.confirm("Yakin hapus data ini?")) return;
    const {error} = await supabase.from(tabel).delete().eq('id', id);
    if(error) alert(error.message); else fetchData(true);
  };

  const tambahUser = async (e) => { e.preventDefault(); await supabase.from('users').insert([{ nisn_nip: formUser.nisn, nama_lengkap: formUser.nama, password_text: formUser.nisn, role: formUser.role }]); setFormUser({ nisn: '', nama: '', role: 'guru' }); fetchData(true); };
  const handleTambahSiswa = async (e) => { e.preventDefault(); await supabase.from('users').insert([{ nisn_nip: formSiswa.nisn, nama_lengkap: formSiswa.nama, kelas: formSiswa.kelas, password_text: formSiswa.nisn, role: 'siswa' }]); setFormSiswa({ nisn: '', nama: '', kelas: '' }); fetchData(true); };
  const handleTambahMapel = async (e) => { e.preventDefault(); await supabase.from('mata_pelajaran').insert([{ nama_mapel: formMapel.nama }]); setFormMapel({ nama: '' }); fetchData(true); };

  const handleTambahPaket = async (e) => {
    e.preventDefault();
    const { error } = await supabase.from('paket_ujian').insert([{ mapel_id: formPaket.mapel_id, kelas_jurusan: formPaket.kelas_jurusan }]);
    if (error) alert("Error! Pastikan Disable RLS di tabel paket_ujian."); else { setFormPaket({ mapel_id: '', kelas_jurusan: '' }); fetchData(true); }
  };

  const toggleStatusPaket = async (id, currentStatus) => {
    await supabase.from('paket_ujian').update({ status_ujian: currentStatus === 'Aktif' ? 'Nonaktif' : 'Aktif' }).eq('id', id);
    fetchData(false);
  };

  const handleTambahSoal = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    let finalGambarUrl = null;
    try {
      if (selectedImage) {
        const fileName = `${Date.now()}.${selectedImage.name.split('.').pop()}`;
        await supabase.storage.from('soal-gambar').upload(fileName, selectedImage);
        finalGambarUrl = supabase.storage.from('soal-gambar').getPublicUrl(fileName).data.publicUrl;
      }
      const { error } = await supabase.from('soal').insert([{ paket_id: selectedPaket.id, mapel_id: selectedPaket.mapel_id, teks_pertanyaan: formSoal.teks, opsi_a: formSoal.a, opsi_b: formSoal.b, opsi_c: formSoal.c, opsi_d: formSoal.d, kunci_jawaban: formSoal.kunci, bobot_nilai: parseInt(formSoal.bobot), gambar_url: finalGambarUrl, status: formSoal.status }]);
      if (error) throw error;
      setFormSoal({ ...formSoal, teks: '', a: '', b: '', c: '', d: '' }); setSelectedImage(null); fetchData(true);
    } catch (err) { alert(err.message); } finally { setIsUploading(false); }
  };

  const uploadExcel = async (e, table, mapper) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      setIsUploading(true);
      try {
        const workbook = XLSX.read(evt.target.result, { type: 'binary' });
        const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        const formattedData = mapper ? rawData.map(mapper).filter(Boolean) : rawData;
        await supabase.from(table).insert(formattedData);
        alert(`Sukses mengimpor ${formattedData.length} baris!`); fetchData(true);
      } catch (err) { alert("Error Import: Pastikan format tabel di Excel sudah benar."); } finally { setIsUploading(false); e.target.value = ''; }
    };
    reader.readAsBinaryString(file);
  };

  const exportToExcel = (dataFiltered) => {
    if (dataFiltered.length === 0) { alert("Tidak ada data untuk diekspor!"); return; }
    const dataUntukExcel = dataFiltered.map((item, index) => ({ 'No': index + 1, 'NISN': item.nisn, 'Nama Siswa': item.nama, 'Kelas': item.kelas, 'Mata Pelajaran': item.mapel, 'Nilai Akhir': item.nilai }));
    const ws = XLSX.utils.json_to_sheet(dataUntukExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Nilai");
    XLSX.writeFile(wb, `Nilai_${filterKelasNilai || 'SemuaKelas'}_${filterMapelNilai || 'SemuaMapel'}.xlsx`);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="w-64 bg-white border-r shadow-sm flex flex-col justify-between hidden md:flex">
        <div>
          <div className="p-6 border-b flex items-center gap-3">
             <img src={logoSekolah} alt="Logo" className="w-10 h-10 object-contain" />
             <div>
                <h2 className="font-bold text-gray-800 leading-tight">{isAdmin ? 'Admin Panel' : (isGuru ? 'Panel Guru' : 'Panel Pengawas')}</h2>
                <p className="text-xs text-emerald-600 font-bold uppercase">{currentUser?.role}</p>
             </div>
          </div>
          <div className="p-4 space-y-1">
            {isAdmin && (
              <>
                <p className="text-[10px] font-bold text-gray-400 mt-2 mb-1 px-4">KONTROL SISTEM</p>
                <button onClick={() => setActiveTab('ruangan')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${activeTab === 'ruangan' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-100'}`}><LayoutDashboard size={18} /> Command Center</button>
                <button onClick={() => setActiveTab('user')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${activeTab === 'user' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-100'}`}><UserCog size={18} /> Manajemen Staff</button>
              </>
            )}
            {(isAdmin || isGuru) && (
              <>
                <p className="text-[10px] font-bold text-gray-400 mt-4 mb-1 px-4">DATA AKADEMIK</p>
                <button onClick={() => setActiveTab('siswa')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${activeTab === 'siswa' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-100'}`}><Users size={18} /> Data Siswa</button>
                <button onClick={() => setActiveTab('mapel')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${activeTab === 'mapel' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-100'}`}><Book size={18} /> Mata Pelajaran</button>
                <button onClick={() => {setActiveTab('soal'); setViewPaket('list');}} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${activeTab === 'soal' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-100'}`}><BookOpen size={18} /> Bank Soal</button>
                <button onClick={() => setActiveTab('analisis')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${activeTab === 'analisis' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-100'}`}><BarChart size={18} /> Analisis Soal</button>
              </>
            )}
            <p className="text-[10px] font-bold text-gray-400 mt-4 mb-1 px-4">EVALUASI UJIAN</p>
            <button onClick={() => setActiveTab('monitoring')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${activeTab === 'monitoring' ? 'bg-red-50 text-red-700' : 'text-gray-600 hover:bg-gray-100'}`}><Activity size={18} /> Live Monitoring</button>
            <button onClick={() => setActiveTab('nilai')} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition ${activeTab === 'nilai' ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-100'}`}><ClipboardList size={18} /> Rekap Nilai</button>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-8 overflow-y-auto h-screen">
        {loading ? (<div className="p-10 text-center font-bold text-gray-500 animate-pulse">Memuat Data Sistem...</div>) : (
          <div className="max-w-6xl mx-auto space-y-6">
            
            {/* COMMAND CENTER */}
            {activeTab === 'ruangan' && isAdmin && (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div><h2 className="text-2xl font-black text-gray-800">Command Center Ruangan</h2></div>
                    <form onSubmit={handleTambahRuangan} className="flex gap-2 bg-gray-50 p-2 rounded-lg border">
                      <input required placeholder="Cth: Ruang Laboratorium 1" className="border p-2 text-sm rounded outline-none w-56" value={formRuangan.nama} onChange={e => setFormRuangan({nama: e.target.value})} />
                      <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded font-bold text-sm hover:bg-emerald-700"><PlusCircle size={16}/></button>
                    </form>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {semuaRuangan.map((ruang) => {
                    const sesi = ruang.sesi_ujian?.[0] || { id: null, token_ujian: '-', status: 'belum_mulai', pengawas_id: null, paket_id: null, durasi_menit: 90 };
                    return (
                      <div key={ruang.id} className={`p-5 border-2 rounded-xl shadow-sm transition ${sesi.status === 'berjalan' ? 'border-emerald-500 bg-emerald-50/30' : 'border-gray-200 bg-white'}`}>
                        <div className="flex justify-between items-center mb-2">
                           <h3 className="font-bold text-lg text-gray-800">{ruang.nama_ruangan}</h3>
                           <div className="flex items-center gap-2">
                             {sesi.status === 'berjalan' && <span className="bg-emerald-500 text-white text-[10px] px-2 py-1 rounded font-bold animate-pulse">Berjalan</span>}
                             <button onClick={() => hapusData('ruangan', ruang.id)} className="text-gray-400 hover:text-red-500 transition"><Trash2 size={16}/></button>
                           </div>
                        </div>
                        <div className="bg-gray-900 text-yellow-400 text-2xl font-black py-4 text-center rounded-lg mb-4 font-mono tracking-widest">{sesi.token_ujian}</div>
                        
                        <div className="mb-3">
                            <label className="text-xs font-bold text-gray-500 mb-1 block">DATA UJIAN (PAKET SOAL)</label>
                            <select className="w-full border p-2 text-sm rounded bg-white outline-none" value={sesi.paket_id || ''} onChange={(e) => assignAtributSesi(ruang.id, sesi.id, 'paket_id', e.target.value)}>
                              <option value="">-- Pilih Paket Ujian --</option>{daftarPaket.filter(p => p.status_ujian === 'Aktif').map(p => <option key={p.id} value={p.id}>{p.mata_pelajaran?.nama_mapel} - {p.kelas_jurusan}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          <div>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">PENGAWAS</label>
                            <select className="w-full border p-2 text-sm rounded bg-white outline-none" value={sesi.pengawas_id || ''} onChange={(e) => assignAtributSesi(ruang.id, sesi.id, 'pengawas_id', e.target.value)}>
                              <option value="">- Kosong -</option>{daftarGuru.filter(g => g.role === 'pengawas' || g.role === 'guru').map(g => <option key={g.id} value={g.id}>{g.nama_lengkap}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">DURASI (MENIT)</label>
                            <input key={`durasi-${sesi.id}`} type="number" className="w-full border p-2 text-sm rounded bg-white outline-none" defaultValue={sesi.durasi_menit || ''} onBlur={(e) => { if (e.target.value && e.target.value != sesi.durasi_menit) assignAtributSesi(ruang.id, sesi.id, 'durasi_menit', e.target.value); }} placeholder="90" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => generateToken(ruang.id, sesi.id)} className="flex-1 bg-blue-600 text-white py-2 rounded font-bold text-sm hover:bg-blue-700">Token</button>
                          <button onClick={() => toggleStatus(ruang.id, sesi.id, sesi.status, sesi.paket_id)} className={`flex-1 py-2 rounded font-bold text-sm text-white ${sesi.status === 'berjalan' ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}>{sesi.status === 'berjalan' ? 'Tutup' : 'Mulai Ujian'}</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* MANAJEMEN USER */}
            {activeTab === 'user' && isAdmin && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 bg-white p-6 rounded-xl shadow-sm border border-gray-200 h-fit">
                  <h3 className="font-bold text-lg mb-4 text-gray-800">Tambah Staff Baru</h3>
                  <form onSubmit={tambahUser} className="space-y-4">
                    <div><label className="text-xs font-bold text-gray-500 mb-1 block">NIP / USERNAME</label><input required className="w-full border p-2 rounded text-sm" value={formUser.nisn} onChange={e => setFormUser({...formUser, nisn: e.target.value})} /></div>
                    <div><label className="text-xs font-bold text-gray-500 mb-1 block">NAMA LENGKAP</label><input required className="w-full border p-2 rounded text-sm" value={formUser.nama} onChange={e => setFormUser({...formUser, nama: e.target.value})} /></div>
                    <div><label className="text-xs font-bold text-gray-500 mb-1 block">PERAN</label><select className="w-full border p-2 rounded text-sm" value={formUser.role} onChange={e => setFormUser({...formUser, role: e.target.value})}><option value="guru">Guru Mapel</option><option value="pengawas">Pengawas Ruangan</option><option value="admin">Admin / Proktor</option></select></div>
                    <button type="submit" className="w-full bg-emerald-600 text-white rounded font-bold py-2 hover:bg-emerald-700">Simpan Akun</button>
                  </form>
                </div>
                <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <table className="w-full text-left text-sm">
                    <thead><tr className="bg-gray-100"><th className="p-3">NIP</th><th className="p-3">Nama</th><th className="p-3">Role</th><th className="p-3">Hapus</th></tr></thead>
                    <tbody>{daftarGuru.map((g) => (<tr key={g.id} className="border-b hover:bg-gray-50"><td className="p-3 font-mono">{g.nisn_nip}</td><td className="p-3 font-medium">{g.nama_lengkap}</td><td className="p-3"><span className="px-2 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-700">{g.role.toUpperCase()}</span></td><td className="p-3"><button onClick={()=>hapusData('users', g.id)}><Trash2 size={16} className="text-red-500"/></button></td></tr>))}</tbody>
                  </table>
                </div>
              </div>
            )}

            {/* SISWA */}
            {activeTab === 'siswa' && (isAdmin || isGuru) && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="font-bold text-lg mb-4 text-gray-800">Registrasi Siswa Manual</h3>
                    <form onSubmit={handleTambahSiswa} className="space-y-3">
                      <div><label className="text-xs font-bold text-gray-500 block">NISN</label><input required className="w-full border p-2 rounded text-sm" value={formSiswa.nisn} onChange={e => setFormSiswa({...formSiswa, nisn: e.target.value})} /></div>
                      <div><label className="text-xs font-bold text-gray-500 block">NAMA LENGKAP</label><input required className="w-full border p-2 rounded text-sm" value={formSiswa.nama} onChange={e => setFormSiswa({...formSiswa, nama: e.target.value})} /></div>
                      <div><label className="text-xs font-bold text-gray-500 block">KELAS</label><input required placeholder="Cth: XII IPA 1" className="w-full border p-2 rounded text-sm" value={formSiswa.kelas} onChange={e => setFormSiswa({...formSiswa, kelas: e.target.value})} /></div>
                      <button type="submit" className="w-full bg-emerald-600 text-white rounded font-bold py-2 hover:bg-emerald-700">Simpan Siswa</button>
                    </form>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-200 bg-blue-50 flex flex-col justify-center items-center text-center">
                    <FileSpreadsheet className="w-16 h-16 text-blue-600 mb-4" />
                    <h3 className="font-bold text-lg text-blue-900 mb-2">Import Massal Siswa</h3>
                    <label className={`w-full ${isUploading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} text-white font-bold py-2.5 px-4 rounded cursor-pointer`}>
                      {isUploading ? "Mengimpor..." : "Upload Excel (NISN, Nama, Kelas)"}
                      <input type="file" accept=".xlsx, .xls, .csv" className="hidden" disabled={isUploading} onChange={(e) => uploadExcel(e, 'users', row => row.NISN || row.nisn ? ({nisn_nip: String(row.NISN || row.nisn), nama_lengkap: String(row.Nama||row.nama||''), kelas: String(row.Kelas||row.kelas||''), password_text: String(row.NISN || row.nisn), role: 'siswa'}) : null)} />
                    </label>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <table className="w-full text-left text-sm">
                    <thead><tr className="bg-gray-100"><th className="p-3 font-semibold">NISN</th><th className="p-3 font-semibold">Nama Lengkap</th><th className="p-3 font-semibold">Kelas</th><th className="p-3 font-semibold">Hapus</th></tr></thead>
                    <tbody>{daftarSiswa.map(s => <tr key={s.id} className="border-b"><td className="p-3 font-mono">{s.nisn_nip}</td><td className="p-3">{s.nama_lengkap}</td><td className="p-3">{s.kelas}</td><td className="p-3"><button onClick={()=>hapusData('users', s.id)}><Trash2 size={16} className="text-red-500"/></button></td></tr>)}</tbody>
                  </table>
                </div>
              </div>
            )}

            {/* MAPEL */}
            {activeTab === 'mapel' && (isAdmin || isGuru) && (
              <div className="space-y-6">
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 w-full md:w-1/2">
                    <h3 className="font-bold text-lg mb-4 text-gray-800">Tambah Mata Pelajaran</h3>
                    <form onSubmit={handleTambahMapel} className="flex gap-2">
                      <input required placeholder="Cth: Matematika Wajib" className="flex-1 border p-2 rounded text-sm outline-none" value={formMapel.nama} onChange={e => setFormMapel({nama: e.target.value})} />
                      <button type="submit" className="bg-blue-600 text-white px-6 rounded font-bold text-sm">Tambah</button>
                    </form>
                 </div>
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 w-full md:w-1/2">
                    <table className="w-full text-left text-sm">
                      <thead><tr className="bg-gray-100"><th className="p-3 font-semibold">Nama Mata Pelajaran</th><th className="p-3 font-semibold text-right">Aksi</th></tr></thead>
                      <tbody>{daftarMapel.map(m => <tr key={m.id} className="border-b"><td className="p-3">{m.nama_mapel}</td><td className="p-3 text-right"><button onClick={()=>hapusData('mata_pelajaran', m.id)}><Trash2 size={16} className="text-red-500"/></button></td></tr>)}</tbody>
                    </table>
                 </div>
              </div>
            )}

            {/* BANK SOAL (MASTER - DETAIL VIEW) */}
            {activeTab === 'soal' && (isAdmin || isGuru) && (
              <div className="space-y-6">
                
                {viewPaket === 'list' && (
                  <>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                      <h3 className="font-bold text-xl mb-4 text-gray-800">Tambah Data Ujian Baru</h3>
                      <form onSubmit={handleTambahPaket} className="flex items-end gap-4">
                        <div className="flex-1">
                          <label className="text-xs font-bold text-gray-500 block mb-1">MATA PELAJARAN</label>
                          <select required className="w-full border p-2.5 rounded outline-none" value={formPaket.mapel_id} onChange={e=>setFormPaket({...formPaket, mapel_id: e.target.value})}>
                            <option value="">- Pilih Mapel -</option>
                            {daftarMapel.map(m=><option key={m.id} value={m.id}>{m.nama_mapel}</option>)}
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="text-xs font-bold text-gray-500 block mb-1">KELAS / JURUSAN</label>
                          <select required className="w-full border p-2.5 rounded outline-none" value={formPaket.kelas_jurusan} onChange={e=>setFormPaket({...formPaket, kelas_jurusan: e.target.value})}>
                            <option value="">- Pilih Kelas -</option>
                            {[...new Set(daftarSiswa.map(s => s.kelas))].filter(Boolean).map(k => (
                              <option key={k} value={k}>{k}</option>
                            ))}
                          </select>
                        </div>
                        <button type="submit" className="bg-blue-600 text-white px-6 py-2.5 rounded font-bold hover:bg-blue-700">Buat Paket</button>
                      </form>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      <div className="p-5 border-b bg-gray-50"><h3 className="font-bold text-lg text-gray-800">Daftar Data Ujian (Bank Soal)</h3></div>
                      <table className="w-full text-left text-sm border-collapse">
                        <thead><tr className="bg-white border-b"><th className="p-4">#</th><th className="p-4">Mata Pelajaran</th><th className="p-4">Kelas/Jurusan</th><th className="p-4 text-center">Jumlah Soal</th><th className="p-4 text-center">Status</th><th className="p-4 text-center">Opsi</th></tr></thead>
                        <tbody className="divide-y divide-gray-100">
                          {daftarPaket.map((paket, index) => {
                            const jumlahSoal = daftarSoal.filter(s => s.paket_id === paket.id).length;
                            return (
                              <tr key={paket.id} className="hover:bg-gray-50">
                                <td className="p-4 text-gray-500">{index + 1}</td>
                                <td className="p-4 font-bold text-gray-800">{paket.mata_pelajaran?.nama_mapel}</td>
                                <td className="p-4 font-medium text-gray-600">{paket.kelas_jurusan}</td>
                                <td className="p-4 text-center">
                                  <button onClick={() => { setSelectedPaket(paket); setViewPaket('detail'); }} className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-1.5 rounded-full font-bold shadow-sm transition">Buat Soal ({jumlahSoal})</button>
                                </td>
                                <td className="p-4 text-center">
                                  <button onClick={() => toggleStatusPaket(paket.id, paket.status_ujian)} className={`px-3 py-1 text-xs font-bold rounded ${paket.status_ujian === 'Aktif' ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>{paket.status_ujian}</button>
                                </td>
                                <td className="p-4 flex gap-2 justify-center">
                                  <button onClick={() => hapusData('paket_ujian', paket.id)} className="bg-red-50 text-red-600 p-2 rounded hover:bg-red-100 transition"><Trash2 size={16}/></button>
                                </td>
                              </tr>
                            )
                          })}
                          {daftarPaket.length === 0 && <tr><td colSpan="6" className="p-8 text-center text-gray-500">Belum ada paket ujian yang dibuat.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {viewPaket === 'detail' && selectedPaket && (
                  <div className="space-y-6">
                    <div className="bg-gray-800 p-6 rounded-xl shadow-lg text-white flex justify-between items-center">
                      <div>
                        <button onClick={() => setViewPaket('list')} className="text-gray-300 hover:text-white flex items-center text-sm font-bold mb-2 transition"><ArrowLeft size={16} className="mr-1"/> Kembali ke Daftar Ujian</button>
                        <h2 className="text-2xl font-black">{selectedPaket.mata_pelajaran?.nama_mapel}</h2>
                        <p className="text-gray-300 font-medium tracking-wide">Kelas/Jurusan: {selectedPaket.kelas_jurusan}</p>
                      </div>
                      <div className="bg-gray-700 px-5 py-3 rounded-lg text-center">
                         <p className="text-xs text-gray-400 font-bold mb-1">TOTAL SOAL</p>
                         <p className="text-3xl font-black text-emerald-400">{daftarSoal.filter(s => s.paket_id === selectedPaket.id).length}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                      <div className="xl:col-span-1 space-y-4 sticky top-6">
                        <form onSubmit={handleTambahSoal} className="bg-white p-5 rounded-lg shadow border border-gray-200 space-y-4">
                          <h3 className="font-bold text-gray-800 text-lg mb-2 flex items-center"><PlusCircle size={18} className="mr-2 text-blue-600" /> Tulis Soal Manual</h3>
                          <div><label className="text-xs font-bold text-gray-500 block mb-1">PERTANYAAN</label><textarea required rows="3" value={formSoal.teks} onChange={e => setFormSoal({ ...formSoal, teks: e.target.value })} className="w-full p-2 border rounded text-sm outline-none"></textarea></div>
                          <div><label className="text-xs font-bold text-gray-500 block mb-1">GAMBAR (Opsional)</label><input type="file" accept="image/*" onChange={e => setSelectedImage(e.target.files[0])} className="w-full text-xs border p-1 rounded bg-gray-50" /></div>
                          <div className="grid grid-cols-2 gap-2">
                            <input required placeholder="Opsi A" value={formSoal.a} onChange={e => setFormSoal({ ...formSoal, a: e.target.value })} className="border p-2 rounded text-sm" />
                            <input required placeholder="Opsi B" value={formSoal.b} onChange={e => setFormSoal({ ...formSoal, b: e.target.value })} className="border p-2 rounded text-sm" />
                            <input required placeholder="Opsi C" value={formSoal.c} onChange={e => setFormSoal({ ...formSoal, c: e.target.value })} className="border p-2 rounded text-sm" />
                            <input required placeholder="Opsi D" value={formSoal.d} onChange={e => setFormSoal({ ...formSoal, d: e.target.value })} className="border p-2 rounded text-sm" />
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div><label className="text-xs font-bold">Kunci</label><select value={formSoal.kunci} onChange={e => setFormSoal({ ...formSoal, kunci: e.target.value })} className="w-full border p-2 rounded text-sm"><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option></select></div>
                            <div><label className="text-xs font-bold">Bobot</label><input required type="number" min="1" value={formSoal.bobot} onChange={e => setFormSoal({ ...formSoal, bobot: e.target.value })} className="w-full border p-2 rounded text-sm" /></div>
                            <div><label className="text-xs font-bold">Status</label><select value={formSoal.status} onChange={e => setFormSoal({ ...formSoal, status: e.target.value })} className="w-full border p-2 rounded text-sm font-bold"><option value="draft">DRAFT</option><option value="publish">PUBLISH</option></select></div>
                          </div>
                          <button type="submit" disabled={isUploading} className="w-full bg-blue-600 text-white font-bold py-2 rounded hover:bg-blue-700">{isUploading ? "Mengunggah..." : "Simpan Soal"}</button>
                        </form>

                        <div className="bg-white p-5 rounded-lg shadow border border-emerald-200 bg-emerald-50 text-center">
                          <h3 className="font-bold text-emerald-900 text-sm mb-2 flex items-center justify-center"><FileSpreadsheet size={16} className="mr-2"/> Import Excel (Otomatis Masuk Paket Ini)</h3>
                          <label className={`block w-full ${isUploading ? 'bg-gray-400' : 'bg-emerald-600 hover:bg-emerald-700'} text-white font-bold py-2.5 rounded text-sm cursor-pointer transition`}>
                            {isUploading ? "Loading..." : "Pilih File Excel"}
                            <input type="file" accept=".xlsx, .xls, .csv" className="hidden" disabled={isUploading} 
                              onChange={(e) => uploadExcel(e, 'soal', row => ({
                                  paket_id: selectedPaket.id,
                                  mapel_id: selectedPaket.mapel_id,
                                  teks_pertanyaan: String(row.Pertanyaan || row.pertanyaan || ''),
                                  opsi_a: String(row.A || row.a || ''),
                                  opsi_b: String(row.B || row.b || ''),
                                  opsi_c: String(row.C || row.c || ''),
                                  opsi_d: String(row.D || row.d || ''),
                                  kunci_jawaban: String(row.Kunci || row.kunci || 'A'),
                                  bobot_nilai: Number(row.Bobot || row.bobot || 10),
                                  status: 'publish'
                              }))} 
                            />
                          </label>
                        </div>
                      </div>

                      <div className="xl:col-span-2 space-y-4">
                        {daftarSoal.filter(s => s.paket_id === selectedPaket.id).map((soal, i) => (
                          <div key={soal.id} className={`bg-white p-5 rounded-lg shadow-sm border-l-4 flex justify-between items-start ${soal.status === 'publish' ? 'border-emerald-500' : 'border-gray-400 opacity-75'}`}>
                            <div className="flex-1 pr-4">
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`text-[10px] px-2 py-0.5 rounded font-black text-white tracking-widest ${soal.status === 'publish' ? 'bg-emerald-500' : 'bg-gray-500'}`}>{soal.status?.toUpperCase()}</span>
                                <span className="text-xs font-bold text-gray-400">Soal #{soal.id}</span>
                              </div>
                              <p className="font-bold text-gray-800 text-sm mb-3 whitespace-pre-line">{soal.teks_pertanyaan}</p>
                              {soal.gambar_url && <img src={soal.gambar_url} alt="Img" className="max-h-40 mb-4 border rounded-lg p-1 bg-gray-50" />}
                              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-600">
                                <span className={soal.kunci_jawaban === 'A' ? 'font-bold text-emerald-600 bg-emerald-50 px-2 rounded' : 'px-2'}>A. {soal.opsi_a}</span>
                                <span className={soal.kunci_jawaban === 'B' ? 'font-bold text-emerald-600 bg-emerald-50 px-2 rounded' : 'px-2'}>B. {soal.opsi_b}</span>
                                <span className={soal.kunci_jawaban === 'C' ? 'font-bold text-emerald-600 bg-emerald-50 px-2 rounded' : 'px-2'}>C. {soal.opsi_c}</span>
                                <span className={soal.kunci_jawaban === 'D' ? 'font-bold text-emerald-600 bg-emerald-50 px-2 rounded' : 'px-2'}>D. {soal.opsi_d}</span>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2">
                              <button onClick={async () => { await supabase.from('soal').update({status: soal.status === 'publish' ? 'draft' : 'publish'}).eq('id', soal.id); fetchData(true); }} className="bg-white border text-gray-700 px-3 py-1.5 rounded text-xs font-bold hover:bg-gray-50 transition shadow-sm">Jadikan {soal.status === 'publish' ? 'Draft' : 'Publish'}</button>
                              <button onClick={() => hapusData('soal', soal.id)} className="bg-red-50 text-red-600 px-3 py-1.5 rounded text-xs font-bold flex items-center justify-center hover:bg-red-100 transition"><Trash2 size={14} className="mr-1"/> Hapus</button>
                            </div>
                          </div>
                        ))}
                        {daftarSoal.filter(s => s.paket_id === selectedPaket.id).length === 0 && <div className="bg-yellow-50 p-10 text-center rounded-xl border border-yellow-200"><p className="font-bold text-yellow-800">Paket ini belum memiliki soal.</p></div>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ANALISIS SOAL */}
            {activeTab === 'analisis' && (isAdmin || isGuru) && (
              <div className="bg-white shadow-sm rounded-xl border border-gray-200 p-6">
                <h3 className="font-bold text-xl text-gray-800 mb-6 flex items-center"><BarChart className="mr-2 text-emerald-600"/> Analisis Butir Soal</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead><tr className="bg-gray-50 border-b"><th className="p-3">Mata Pelajaran</th><th className="p-3">Potongan Soal</th><th className="p-3 text-center">Menjawab Benar</th><th className="p-3 text-center">Menjawab Salah</th><th className="p-3">Tingkat Kesulitan</th></tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {analisisSoal.map(stat => (
                        <tr key={stat.id} className="hover:bg-gray-50">
                          <td className="p-3 font-bold text-blue-700">{stat.mapel}</td>
                          <td className="p-3 text-gray-600 truncate max-w-xs">{stat.teks}</td>
                          <td className="p-3 text-center font-bold text-emerald-600">{stat.benar}</td>
                          <td className="p-3 text-center font-bold text-red-500">{stat.salah}</td>
                          <td className="p-3 w-48">
                            <div className="w-full bg-gray-200 rounded-full h-2.5 flex items-center justify-between mt-1"><div className={`h-2.5 rounded-full ${stat.persentase > 70 ? 'bg-emerald-500' : stat.persentase > 40 ? 'bg-yellow-400' : 'bg-red-500'}`} style={{width: `${stat.persentase}%`}}></div></div>
                            <span className="text-[10px] text-gray-500">{stat.persentase}% Siswa Benar</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* REKAP NILAI */}
            {activeTab === 'nilai' && (
              <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
                  <div>
                    <h3 className="font-bold text-xl text-gray-800 mb-4">Rekapitulasi Nilai Ujian</h3>
                    <div className="flex gap-3">
                      <div><label className="text-xs font-bold block mb-1">Filter Kelas</label><select className="border p-2 rounded text-sm w-40" value={filterKelasNilai} onChange={(e) => setFilterKelasNilai(e.target.value)}><option value="">Semua Kelas</option>{[...new Set(rekapNilai.map(item => item.kelas))].filter(Boolean).map(k => <option key={k} value={k}>{k}</option>)}</select></div>
                      <div><label className="text-xs font-bold block mb-1">Filter Mapel</label><select className="border p-2 rounded text-sm w-48" value={filterMapelNilai} onChange={(e) => setFilterMapelNilai(e.target.value)}><option value="">Semua Mapel</option>{[...new Set(rekapNilai.map(item => item.mapel))].filter(Boolean).map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                    </div>
                  </div>
                  <button onClick={() => exportToExcel(rekapNilai.filter(item => (filterKelasNilai === '' || item.kelas === filterKelasNilai) && (filterMapelNilai === '' || item.mapel === filterMapelNilai)))} className="bg-emerald-600 text-white px-5 py-2.5 rounded-lg font-bold text-sm hover:bg-emerald-700 flex items-center shadow-sm"><Download size={18} className="mr-2" /> Download Excel</button>
                </div>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead className="bg-gray-50 text-gray-700 font-semibold border-b"><tr><th className="p-4">NISN</th><th className="p-4">Nama Siswa</th><th className="p-4">Kelas</th><th className="p-4">Mata Pelajaran</th><th className="p-4 text-center">Nilai Akhir</th><th className="p-4 text-center">Aksi Admin</th></tr></thead>
                    <tbody className="divide-y divide-gray-200">
                      {rekapNilai.filter(item => (filterKelasNilai === '' || item.kelas === filterKelasNilai) && (filterMapelNilai === '' || item.mapel === filterMapelNilai)).map((s, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition">
                          <td className="p-4 font-mono text-gray-600">{s.nisn}</td><td className="p-4 font-bold">{s.nama}</td><td className="p-4 text-gray-600">{s.kelas}</td><td className="p-4"><span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold">{s.mapel}</span></td><td className="p-4 text-center"><span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-bold">{s.nilai}</span></td>
                          <td className="p-4 text-center"><button onClick={async () => { if(!window.confirm("RESET UJIAN? Semua jawaban dan nilai siswa ini akan dihapus permanen!")) return; await supabase.from('jawaban_siswa').delete().eq('siswa_id', s.siswa_id); await supabase.from('log_pelanggaran').delete().eq('siswa_id', s.siswa_id); await supabase.from('aktivitas_ujian').delete().eq('siswa_id', s.siswa_id); alert("Ujian direset."); fetchData(true); }} className="bg-red-100 text-red-700 px-3 py-1 rounded font-bold text-xs flex items-center justify-center mx-auto hover:bg-red-200"><RefreshCcw size={12} className="mr-1"/> Reset Ujian</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB BARU: LIVE MONITORING 2.0 (AKTIVITAS & PELANGGARAN) */}
            {activeTab === 'monitoring' && (
              <div className="space-y-6">
                
                {/* 1. TABEL AKTIVITAS LIVE */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-200 border-t-4 border-t-blue-500">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="font-bold text-xl text-blue-800 flex items-center"><Users size={24} className="mr-2"/> Status Live Peserta Ujian</h3>
                      <p className="text-sm mt-1 text-gray-500">Memonitor siswa yang sedang berada di dalam ruang ujian.</p>
                    </div>
                    <button onClick={() => fetchData(true)} className="bg-gray-100 px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-200">Refresh Data</button>
                  </div>
                  
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead><tr className="bg-blue-50 text-blue-800 border-b border-blue-100"><th className="p-4">Ruangan</th><th className="p-4">Nama Siswa</th><th className="p-4">Kelas</th><th className="p-4">Waktu Mulai</th><th className="p-4">Status Saat Ini</th></tr></thead>
                      <tbody className="divide-y divide-gray-100">
                        {aktivitasSiswa.length === 0 ? (
                          <tr><td colSpan="5" className="p-8 text-center text-gray-500 font-bold">Belum ada siswa yang memulai ujian.</td></tr>
                        ) : (
                          aktivitasSiswa.map((akt) => (
                            <tr key={akt.id} className="hover:bg-blue-50/30">
                              <td className="p-4 font-bold text-gray-800">{akt.sesi_ujian?.ruangan?.nama_ruangan || '-'}</td>
                              <td className="p-4 font-bold">{akt.users?.nama_lengkap || '-'}</td>
                              <td className="p-4">{akt.users?.kelas || '-'}</td>
                              <td className="p-4 font-mono text-gray-500">{new Date(akt.waktu_mulai).toLocaleTimeString('id-ID')}</td>
                              <td className="p-4">
                                <span className={`px-3 py-1 rounded-full font-bold text-xs flex items-center w-fit ${akt.status === 'Selesai Ujian' ? 'bg-gray-100 text-gray-600' : 'bg-emerald-100 text-emerald-700 animate-pulse'}`}>
                                  {akt.status === 'Selesai Ujian' ? <CheckCircle size={12} className="mr-1"/> : <Eye size={12} className="mr-1"/>}
                                  {akt.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. TABEL LOG PELANGGARAN */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-red-200 border-t-4 border-t-red-500">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <h3 className="font-bold text-xl text-red-800 flex items-center"><Activity size={24} className="mr-2"/> Log Indikasi Kecurangan</h3>
                      <p className="text-sm mt-1 text-gray-500">Mencatat siswa yang keluar dari aplikasi/tab saat ujian berlangsung.</p>
                    </div>
                  </div>
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead><tr className="bg-red-50 text-red-800 border-b border-red-100"><th className="p-4">Waktu Kejadian</th><th className="p-4">Ruangan</th><th className="p-4">Nama Siswa</th><th className="p-4">Kelas</th><th className="p-4">Jenis Pelanggaran</th></tr></thead>
                      <tbody className="divide-y divide-gray-100">
                        {logPelanggaran.length === 0 ? (
                          <tr><td colSpan="5" className="p-8 text-center text-gray-500 font-bold">Belum ada catatan pelanggaran yang terdeteksi.</td></tr>
                        ) : (
                          logPelanggaran.map((log) => (
                            <tr key={log.id} className="hover:bg-red-50/30">
                              <td className="p-4 font-mono text-gray-600">{new Date(log.waktu).toLocaleTimeString('id-ID')}</td>
                              <td className="p-4 font-bold">{log.sesi_ujian?.ruangan?.nama_ruangan || '-'}</td>
                              <td className="p-4 font-bold">{log.users?.nama_lengkap || '-'}</td>
                              <td className="p-4">{log.users?.kelas || '-'}</td>
                              <td className="p-4"><span className="bg-red-100 text-red-700 px-2 py-1 rounded font-bold text-xs">{log.keterangan}</span></td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

          </div>
        )}
      </main>
    </div>
  );
};

// =========================================================================
// --- TAMPILAN SOAL SISWA (WITH LOBBY, BIODATA, MOTIVASI, DYNAMIC RESULT) ---
// =========================================================================
const StudentView = ({ currentUser, currentSesi }) => {
  const [soalList, setSoalList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [jawabanSiswa, setJawabanSiswa] = useState({});
  const [raguRagu, setRaguRagu] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSelesai, setIsSelesai] = useState(false);
  const [nilaiAkhir, setNilaiAkhir] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [debugInfo, setDebugInfo] = useState({ idPaket: null, totalDiDB: 0, totalPublish: 0 });
  
  const [examMulai, setExamMulai] = useState(false);
  const [paketInfo, setPaketInfo] = useState(null);

  const [endTime, setEndTime] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);

  const examKey = `exam_recovery_${currentUser.id}_${currentSesi.id}`;

  useEffect(() => {
    const handleVisibilityChange = async () => { 
      if (document.hidden && !isSelesai && examMulai) { 
        setShowWarning(true); 
        const { error } = await supabase.from('log_pelanggaran').insert({ siswa_id: currentUser.id, sesi_ujian_id: currentSesi.id, waktu: new Date().toISOString(), keterangan: 'Pindah Tab / Keluar Layar Ujian' });
        if (error) console.error("Gagal simpan log:", error.message);
      } 
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isSelesai, examMulai, currentUser.id, currentSesi.id]);

  useEffect(() => {
    const initExam = async () => {
      setDebugInfo(prev => ({ ...prev, idPaket: currentSesi.paket_id }));
      
      if (currentSesi.paket_id) {
         const { data: dPaket } = await supabase.from('paket_ujian').select('kelas_jurusan, mata_pelajaran(nama_mapel)').eq('id', currentSesi.paket_id).single();
         if (dPaket) setPaketInfo(dPaket);
      }

      const savedData = JSON.parse(localStorage.getItem(examKey));
      const { data } = await supabase.from('soal').select('*').eq('paket_id', currentSesi.paket_id);
      
      if (data) {
        const publishedSoal = data.filter(s => s.status?.toLowerCase() === 'publish');
        setDebugInfo({ idPaket: currentSesi.paket_id, totalDiDB: data.length, totalPublish: publishedSoal.length });

        if (publishedSoal.length > 0) {
          let processedSoal = [];
          if (savedData && savedData.shuffledSoal && savedData.shuffledSoal.length > 0) {
             processedSoal = savedData.shuffledSoal;
             setJawabanSiswa(savedData.jawabanSiswa || {});
             setRaguRagu(savedData.raguRagu || {});
          } else {
             processedSoal = publishedSoal.sort(() => Math.random() - 0.5).map(soal => ({
                ...soal, shuffledOptions: ['A', 'B', 'C', 'D'].sort(() => Math.random() - 0.5) 
             }));
          }
          setSoalList(processedSoal);
        }
      }

      const savedEndTime = localStorage.getItem(`${examKey}_endTime`);
      if (savedEndTime) {
          setEndTime(parseInt(savedEndTime));
          setExamMulai(true);
      }
      
      setLoading(false);
    };
    initExam();
  }, [currentSesi]);

  useEffect(() => {
    if (soalList.length > 0 && examMulai && !isSelesai) {
       localStorage.setItem(examKey, JSON.stringify({ jawabanSiswa, raguRagu, shuffledSoal: soalList }));
    }
  }, [jawabanSiswa, raguRagu, soalList, isSelesai, examMulai]);

  useEffect(() => {
    if (!endTime || isSelesai || !examMulai) return;
    const interval = setInterval(() => {
        const distance = endTime - Date.now();
        if (distance <= 0) {
            clearInterval(interval); setTimeLeft(0); handleKirimJawaban(true); 
        } else {
            setTimeLeft(Math.floor(distance / 1000));
        }
    }, 1000);
    return () => clearInterval(interval);
  }, [endTime, isSelesai, examMulai]);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600); const m = Math.floor((seconds % 3600) / 60); const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m < 10 ? '0'+m : m}:${s < 10 ? '0'+s : s}`;
  };

  const handleMulaiUjianClick = async () => {
     if (soalList.length === 0) {
        alert("Soal belum tersedia/belum dipublish oleh Guru!"); return;
     }
     if (!window.confirm("Waktu ujian akan mulai berjalan. Anda sudah siap?")) return;
     
     const durasi = currentSesi.durasi_menit || 90;
     const newEndTime = Date.now() + (durasi * 60000);
     localStorage.setItem(`${examKey}_endTime`, newEndTime);
     setEndTime(newEndTime);
     setExamMulai(true);

     // --- FITUR BARU: Catat Aktivitas Siswa Mulai Ujian ---
     const { data: cekAkt } = await supabase.from('aktivitas_ujian').select('id').eq('siswa_id', currentUser.id).eq('sesi_ujian_id', currentSesi.id);
     if (!cekAkt || cekAkt.length === 0) {
         await supabase.from('aktivitas_ujian').insert({ siswa_id: currentUser.id, sesi_ujian_id: currentSesi.id, status: 'Sedang Mengerjakan' });
     }
  };

  const handlePilihJawaban = (soalId, originalOptionLetter) => setJawabanSiswa({ ...jawabanSiswa, [soalId]: originalOptionLetter });
  const handleToggleRagu = (soalId) => setRaguRagu({ ...raguRagu, [soalId]: !raguRagu[soalId] });

  const handleKirimJawaban = async (isAutoSubmit = false) => {
    if (!isAutoSubmit) {
       if (soalList.some(soal => raguRagu[soal.id])) { alert("Hilangkan tanda ragu-ragu terlebih dahulu!"); return; }
       
       const dijawab = Object.keys(jawabanSiswa).length;
       const total = soalList.length;
       
       if (dijawab < total) {
           if (!window.confirm(`PERHATIAN!\n\nAda ${total - dijawab} soal yang BELUM dijawab. Soal yang kosong akan otomatis bernilai 0.\n\nApakah Anda benar-benar yakin ingin mengumpulkan jawaban sekarang?`)) return;
       } else {
           if (!window.confirm("Yakin ingin mengumpulkan jawaban? Pastikan semua sudah diperiksa kembali.")) return;
       }
    }

    let totalNilai = 0;
    soalList.forEach(soal => { if (jawabanSiswa[soal.id] === soal.kunci_jawaban) { totalNilai += soal.bobot_nilai; } });
    setNilaiAkhir(totalNilai);

    const dataUntukDisimpan = Object.keys(jawabanSiswa).map(soalId => ({ siswa_id: currentUser.id, sesi_ujian_id: currentSesi.id, soal_id: parseInt(soalId), jawaban_dipilih: jawabanSiswa[soalId] }));
    if (dataUntukDisimpan.length > 0) {
      await supabase.from('jawaban_siswa').insert(dataUntukDisimpan);
    }

    // --- FITUR BARU: Update Status Aktivitas menjadi Selesai ---
    await supabase.from('aktivitas_ujian').update({ status: 'Selesai Ujian' }).eq('siswa_id', currentUser.id).eq('sesi_ujian_id', currentSesi.id);
    
    localStorage.removeItem(examKey); localStorage.removeItem(`${examKey}_endTime`); setIsSelesai(true);
  };

  if (loading) return <div className="p-10 text-center font-bold text-emerald-600">Mempersiapkan Lingkungan Ujian...</div>;
  
  // --- TAMPILAN HASIL UJIAN (DINAMIS & LENGKAP) ---
  if (isSelesai) {
    let EmoticonIcon = Flame;
    let message = "Jangan menyerah!";
    let subMessage = "Terus belajar dan tingkatkan lagi pemahamanmu. Kamu pasti bisa lebih baik di kesempatan berikutnya!";
    let colorClass = "text-orange-500";
    let bgClass = "bg-orange-50 border-orange-200";

    if (nilaiAkhir >= 85) { 
        EmoticonIcon = Award; 
        message = "Luar Biasa!"; 
        subMessage = "Pertahankan prestasimu yang gemilang ini. Kamu telah menguasai materi dengan sangat baik!";
        colorClass = "text-blue-600"; 
        bgClass = "bg-blue-50 border-blue-200";
    } else if (nilaiAkhir >= 70) { 
        EmoticonIcon = ThumbsUp; 
        message = "Kerja Bagus!"; 
        subMessage = "Kamu sudah berusaha dengan baik. Sedikit lagi menuju sempurna, terus pertahankan belajarmu.";
        colorClass = "text-emerald-600"; 
        bgClass = "bg-emerald-50 border-emerald-200";
    }

    return (
      <div className="max-w-2xl mx-auto mt-10 p-6">
        <div className={`bg-white rounded-2xl shadow-xl overflow-hidden border-t-8 ${nilaiAkhir >= 85 ? 'border-blue-500' : nilaiAkhir >= 70 ? 'border-emerald-500' : 'border-orange-500'}`}>
           <div className="p-8 text-center border-b border-gray-100">
               <EmoticonIcon className={`w-24 h-24 mx-auto mb-4 ${colorClass} animate-bounce`} />
               <h2 className={`text-3xl font-black mb-2 ${colorClass}`}>{message}</h2>
               <p className="text-gray-600 max-w-md mx-auto">{subMessage}</p>
           </div>
           
           <div className="p-8">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Ringkasan Hasil Ujian</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-3">
                    <div><p className="text-xs font-bold text-gray-500">NAMA SISWA</p><p className="font-bold text-gray-800">{currentUser.nama_lengkap}</p></div>
                    <div><p className="text-xs font-bold text-gray-500">NISN</p><p className="font-mono text-gray-800">{currentUser.nisn_nip}</p></div>
                    <div><p className="text-xs font-bold text-gray-500">KELAS</p><p className="font-bold text-gray-800">{currentUser.kelas}</p></div>
                 </div>
                 <div className="space-y-3">
                    <div><p className="text-xs font-bold text-gray-500">MATA PELAJARAN</p><p className="font-bold text-gray-800">{paketInfo?.mata_pelajaran?.nama_mapel || '-'}</p></div>
                    <div><p className="text-xs font-bold text-gray-500">NILAI AKHIR</p>
                      <div className={`mt-1 inline-block px-6 py-2 rounded-lg border ${bgClass}`}>
                        <span className={`text-4xl font-black ${colorClass}`}>{nilaiAkhir}</span>
                      </div>
                    </div>
                 </div>
              </div>
           </div>
           <div className="bg-gray-50 p-6 text-center">
              <button onClick={() => window.location.reload()} className="bg-gray-800 text-white px-8 py-3 rounded-full font-bold shadow-md hover:bg-gray-900 transition">Selesai & Keluar</button>
           </div>
        </div>
      </div>
    );
  }

  // --- TAMPILAN RUANG TUNGGU (LOBBY + MOTIVASI + BIODATA) ---
  if (!examMulai) {
     return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 mt-6">
           <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden mb-8 flex flex-col md:flex-row">
              <div className="bg-blue-600 text-white p-8 md:w-1/3 flex flex-col justify-center items-center text-center">
                  <div className="bg-white/20 p-4 rounded-full mb-4">
                     <Users size={48} className="text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-1">{currentUser.nama_lengkap}</h3>
                  <p className="text-blue-200 font-mono mb-2">{currentUser.nisn_nip}</p>
                  <span className="bg-blue-800 px-3 py-1 rounded-full text-xs font-bold">{currentUser.kelas}</span>
              </div>
              <div className="p-8 md:w-2/3 flex flex-col justify-center">
                  <h2 className="text-2xl font-black text-gray-800 mb-4 flex items-center"><Info className="mr-2 text-blue-500"/> Persiapan Ujian</h2>
                  <p className="text-gray-600 mb-4 leading-relaxed">
                     Silakan baca doa terlebih dahulu sebelum memulai ujian. Pastikan koneksi internet Anda stabil dan perangkat dalam kondisi baterai yang cukup.
                  </p>
                  <p className="text-gray-600 leading-relaxed mb-6">
                     Fokuslah pada pertanyaan dan kerjakan dengan jujur. Jangan meninggalkan layar ujian, atau sistem akan mencatat aktivitas Anda sebagai pelanggaran.
                  </p>
                  <p className="font-bold text-blue-600 text-lg">Selamat mengerjakan dan semoga sukses!</p>
              </div>
           </div>

           <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
              <div className="p-5 bg-gray-50 border-b">
                 <h2 className="text-lg font-bold text-gray-800">Daftar Ujian Anda</h2>
              </div>
              <div className="p-5">
                 <div className="overflow-x-auto border rounded-xl">
                    <table className="w-full text-left text-sm">
                       <thead className="bg-gray-50 border-b">
                          <tr><th className="p-4 text-center">No</th><th className="p-4">Mata Pelajaran</th><th className="p-4">Target Kelas</th><th className="p-4">Durasi Ujian</th><th className="p-4 text-center">Aksi</th></tr>
                       </thead>
                       <tbody className="divide-y divide-gray-100">
                          <tr className="hover:bg-yellow-50/30 transition">
                             <td className="p-4 text-center font-bold">1</td>
                             <td className="p-4 font-bold text-gray-800 text-lg">{paketInfo?.mata_pelajaran?.nama_mapel || 'Paket Ujian Belum Diset'}</td>
                             <td className="p-4 font-medium text-gray-600">{paketInfo?.kelas_jurusan || '-'}</td>
                             <td className="p-4 font-mono font-bold text-gray-700">{currentSesi.durasi_menit} Menit</td>
                             <td className="p-4 flex justify-center">
                                <button onClick={handleMulaiUjianClick} className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold px-6 py-2.5 rounded shadow-sm flex items-center transition transform hover:scale-105">
                                   <PlayCircle size={16} className="mr-2" /> Kerjakan
                                </button>
                             </td>
                          </tr>
                       </tbody>
                    </table>
                 </div>
              </div>
           </div>
        </div>
     );
  }

  // --- TAMPILAN SOAL UJIAN (SETELAH KLIK KERJAKAN) ---
  const soalAktif = soalList[currentIndex];

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 relative">
      {showWarning && (
        <div className="fixed inset-0 bg-red-900 bg-opacity-95 z-50 flex flex-col items-center justify-center p-6 text-center"><AlertTriangle className="w-32 h-32 text-yellow-400 mb-6 animate-pulse" /><h1 className="text-4xl font-bold text-white mb-4">PERINGATAN KECURANGAN!</h1><p className="text-white mb-8">Aktivitas keluar layar telah dilaporkan ke Pengawas.</p><button onClick={() => setShowWarning(false)} className="bg-white text-red-900 font-bold py-3 px-8 rounded-lg">Kembali Ujian</button></div>
      )}

      <div className="bg-white p-4 rounded-lg shadow border border-gray-200 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div><h2 className="text-xl font-bold text-gray-800">{paketInfo?.mata_pelajaran?.nama_mapel}</h2><p className="text-sm text-gray-600">Peserta: <span className="font-bold text-blue-600">{currentUser?.nama_lengkap}</span></p></div>
          <div className="flex items-center gap-3">
             <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg font-mono font-bold flex items-center border border-red-200"><Timer size={18} className="mr-2 animate-pulse" /> {formatTime(timeLeft)}</div>
             <div className="bg-gray-800 text-white px-4 py-2 rounded-lg font-mono font-bold text-sm">Terjawab: {Object.keys(jawabanSiswa).length} / {soalList.length}</div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 flex flex-col justify-between bg-white shadow rounded-xl border border-gray-200 min-h-[450px]">
          <div className="p-6 flex flex-col">
            <div className="bg-emerald-50 text-emerald-800 font-bold px-4 py-2 rounded mb-5 text-sm w-fit">SOAL NOMOR {currentIndex + 1}</div>
            {soalAktif?.gambar_url && <div className="mb-5 p-2 border border-gray-200 rounded-xl bg-white w-fit max-w-full shadow-sm"><img src={soalAktif.gambar_url} alt="Gambar Soal" className="max-h-80 w-auto object-contain rounded-lg" /></div>}
            <p className="text-lg font-medium text-gray-900 mb-6 whitespace-pre-line text-left">{soalAktif?.teks_pertanyaan}</p>
            
            <div className="space-y-3">
              {['A', 'B', 'C', 'D'].map((displayLabel, index) => {
                const originalOptionLetter = soalAktif.shuffledOptions[index]; 
                const optionText = soalAktif[`opsi_${originalOptionLetter.toLowerCase()}`]; 
                const isSelected = jawabanSiswa[soalAktif.id] === originalOptionLetter;
                return (
                  <label key={displayLabel} className={`flex items-center p-4 border rounded-xl cursor-pointer transition ${isSelected ? 'bg-emerald-50 border-emerald-500 ring-2' : 'hover:bg-gray-50'}`}>
                    <input type="radio" name={`soal-${soalAktif.id}`} value={originalOptionLetter} checked={isSelected} className="w-4 h-4 text-emerald-600" onChange={() => handlePilihJawaban(soalAktif.id, originalOptionLetter)} />
                    <span className="ml-3 font-bold mr-2 text-gray-700">{displayLabel}.</span><span className="text-gray-900">{optionText}</span>
                  </label>
                )
              })}
            </div>
          </div>
          <div className="bg-gray-50 p-4 border-t flex flex-wrap justify-between items-center gap-2">
            <button disabled={currentIndex === 0} onClick={() => setCurrentIndex(prev => prev - 1)} className="bg-white border px-4 py-2.5 rounded-lg font-semibold text-sm flex items-center hover:bg-gray-100 disabled:opacity-40"><ChevronLeft size={16} className="mr-1" /> Sebelumnya</button>
            <button onClick={() => handleToggleRagu(soalAktif.id)} className={`px-5 py-2.5 rounded-lg font-bold text-sm flex items-center border transition ${raguRagu[soalAktif?.id] ? 'bg-yellow-500 text-white' : 'bg-yellow-100 text-yellow-800'}`}>Ragu-Ragu</button>
            {currentIndex < soalList.length - 1 ? (
              <button onClick={() => setCurrentIndex(prev => prev + 1)} className="bg-emerald-600 text-white px-5 py-2.5 rounded-lg font-semibold text-sm flex items-center hover:bg-emerald-700">Berikutnya <ChevronRight size={16} className="ml-1" /></button>
            ) : (
              <button onClick={() => handleKirimJawaban(false)} className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-blue-700 shadow-md">Selesai Ujian</button>
            )}
          </div>
        </div>
        
        <div className="bg-white shadow rounded-xl border border-gray-200 p-5 flex flex-col justify-between min-h-[300px]">
          <div>
            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center"><HelpCircle size={16} className="mr-2" /> Peta Navigasi</h3>
            <div className="grid grid-cols-5 gap-2">
              {soalList.map((soal, index) => {
                let btnClass = "bg-gray-100 text-gray-700 hover:bg-gray-200";
                if (raguRagu[soal.id]) btnClass = "bg-yellow-500 text-white";
                else if (jawabanSiswa[soal.id]) btnClass = "bg-emerald-600 text-white";
                const isActive = currentIndex === index ? 'ring-4 ring-emerald-500/30 border-emerald-500 font-black' : '';
                return <button key={soal.id} onClick={() => setCurrentIndex(index)} className={`h-11 border rounded-lg text-sm font-bold flex items-center justify-center transition-all ${btnClass} ${isActive}`}>{index + 1}</button>;
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// =========================================================================
// --- KOMPONEN ROOT / UTAMA ---
// =========================================================================
export default function CBTSystem() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [currentSesi, setCurrentSesi] = useState(null);
  const [loginData, setLoginData] = useState({ nisn: '', password: '', token: '' });

  const handleLogin = async (e) => {
    e.preventDefault();
    const { data: user, error } = await supabase.from('users').select('*').eq('nisn_nip', loginData.nisn).eq('password_text', loginData.password).single();

    if (error || !user) { alert("NISN/NIP/Username atau Password salah!"); return; }
    const userRole = user.role.toLowerCase().trim();

    if (userRole === 'siswa') {
      const { data: sesi, error: sesiError } = await supabase.from('sesi_ujian').select('*').eq('token_ujian', loginData.token).eq('status', 'berjalan').single();
      if (sesiError || !sesi) { alert("Token ujian tidak valid atau Ujian sedang ditutup!"); return; }
      setCurrentSesi(sesi);
    }
    
    setCurrentUser({ ...user, role: userRole });
    setIsLoggedIn(true);
  };

  if (!isLoggedIn) {
   if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#f0f4f8] flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-md rounded-[32px] shadow-lg overflow-hidden relative">
          
          {/* Garis Hijau di Atas (Top Border) */}
          <div className="h-3 bg-[#008751] w-full absolute top-0 left-0"></div>

          <div className="p-8 pt-10 flex flex-col items-center">
            {/* Logo Sekolah (Menggunakan variabel logoSekolah dari import) */}
            <img src={logoSekolah} alt="Logo SMK Samudera Buana" className="w-24 h-auto object-contain mb-4" />
            
            {/* Judul & Sub-judul */}
            <h1 className="text-2xl font-bold text-[#0077b6] text-center mb-1">PORTAL SMK SAMUDERA BUANA</h1>
            <p className="text-gray-500 text-sm text-center mb-8">Login siswa, guru, atau admin</p>

            {/* Form Login */}
            <form onSubmit={handleLogin} className="w-full space-y-4">
              
              {/* Input Username */}
              <input 
                type="text" 
                required 
                placeholder="Masukkan Username / NISN" 
                value={loginData.nisn} 
                onChange={e => setLoginData({...loginData, nisn: e.target.value})} 
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0077b6] focus:border-transparent text-gray-700 placeholder-gray-400" 
              />
              
              {/* Input Password */}
              <input 
                type="password" 
                required 
                placeholder="Masukkan Password" 
                value={loginData.password} 
                onChange={e => setLoginData({...loginData, password: e.target.value})} 
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0077b6] focus:border-transparent text-gray-700 placeholder-gray-400" 
              />

              {/* Input Token Ujian (Disembunyikan secara visual jika guru, tapi tetap diperlukan sistem) */}
              <div className="pt-2">
                <input 
                  type="text" 
                  placeholder="Token Ujian (Khusus Siswa)" 
                  value={loginData.token} 
                  onChange={e => setLoginData({...loginData, token: e.target.value.toUpperCase()})} 
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#0077b6] focus:border-transparent text-gray-700 placeholder-gray-400" 
                />
                <p className="text-center text-[10px] text-gray-400 font-medium mt-1">
                  *Kosongkan Token Ujian jika masuk sebagai Guru/Admin
                </p>
              </div>

              {/* Tombol Login */}
              <button 
                type="submit" 
                className="w-full bg-[#0077b6] hover:bg-[#025f92] text-white font-bold py-3 px-4 rounded-xl transition-all duration-200 mt-2 tracking-wide"
              >
                LOGIN
              </button>
            </form>

            {/* Footer Copyright */}
            <div className="w-full border-t border-gray-100 mt-8 pt-4">
              <p className="text-center text-xs text-gray-400 font-medium">Copyright © rzwann_m</p>
            </div>

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 font-sans">
      <nav className="bg-gray-900 text-white p-4 flex justify-between items-center shadow-lg z-10 relative">
        <span className="font-bold flex items-center"><Monitor className="mr-2"/> CBT Online - Portal {currentUser?.role.toUpperCase()}</span>
        <button onClick={() => { setIsLoggedIn(false); setCurrentUser(null); setCurrentSesi(null); setLoginData({ nisn: '', password: '', token: '' }); }} className="bg-red-600 px-4 py-2 rounded text-sm font-bold hover:bg-red-700 flex items-center transition"><LogOut size={16} className="mr-2" /> Keluar</button>
      </nav>
      <div className="flex-1 overflow-auto bg-gray-100">
        {currentUser?.role === 'siswa' ? <StudentView currentUser={currentUser} currentSesi={currentSesi} /> : <DashboardView currentUser={currentUser} />}
      // Tambahkan ini di bagian paling bawah return kedua (Dashboard)
        <div className="text-center p-4 text-xs text-gray-400">
         Copyright © rzwann_m
        </div>
      </div>
    </div>
  );
}
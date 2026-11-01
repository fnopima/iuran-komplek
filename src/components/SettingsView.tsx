import React, { useState, useRef } from 'react';
import {
  Settings as SettingsIcon,
  Save,
  MessageSquare,
  Building,
  CreditCard,
  Lock,
  Copy,
  Check,
  Megaphone,
  Share2,
  Database,
  Download,
  Upload,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import {
  updateAppSettings,
  exportDatabaseBackup,
  importDatabaseBackup,
  clearAllDummyData,
  resetAllDataToEmpty,
} from '../lib/database';
import type { AppSettings, UserRole, Payment, Expense, Resident, OtherIncome, DatabaseInfo } from '../types';
import { formatRupiah, getCurrentPeriodMonth, formatPeriodMonth } from '../lib/formatters';

interface SettingsViewProps {
  settings: AppSettings;
  userRole: UserRole;
  payments: Payment[];
  expenses: Expense[];
  residents: Resident[];
  otherIncomes?: OtherIncome[];
  dbInfo?: DatabaseInfo;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  userRole,
  payments,
  expenses,
  residents,
  otherIncomes = [],
  dbInfo,
}) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [dbNotice, setDbNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentPeriod = getCurrentPeriodMonth();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateAppSettings(formData);
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      alert('Gagal menyimpan pengaturan.');
      setIsSaving(false);
    }
  };

  const handleExportBackup = () => {
    try {
      const dataStr = exportDatabaseBackup();
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup-iuran-komplek-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setDbNotice({ type: 'success', message: 'Cadangan database berhasil diunduh!' });
      setTimeout(() => setDbNotice(null), 4000);
    } catch (err) {
      setDbNotice({ type: 'error', message: 'Gagal mengunduh cadangan database.' });
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        await importDatabaseBackup(content);
        setDbNotice({ type: 'success', message: 'Database berhasil dipulihkan dari berkas JSON!' });
        setTimeout(() => setDbNotice(null), 4000);
      } catch (err: any) {
        setDbNotice({
          type: 'error',
          message: err?.message || 'Format berkas tidak sesuai atau data korup.',
        });
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handlePurgeDummyData = async () => {
    if (!confirm('Bersihkan semua data bawaan/dummy yang masih tersisa dari database? Data riil yang Anda input tidak akan terhapus.')) {
      return;
    }
    setIsResetting(true);
    try {
      const res = await clearAllDummyData();
      setDbNotice({
        type: 'success',
        message: `Pembersihan berhasil! ${res.residentsRemoved} warga dummy, ${res.paymentsRemoved} iuran dummy, dan ${res.expensesRemoved} pengeluaran dummy telah dihapus.`,
      });
      setTimeout(() => setDbNotice(null), 5000);
    } catch (err) {
      setDbNotice({ type: 'error', message: 'Gagal membersihkan data dummy.' });
    } finally {
      setIsResetting(false);
    }
  };

  const handleClearAllData = async () => {
    if (!confirm('PERHATIAN: Apakah Anda yakin ingin mengosongkan seluruh data transaksi (Warga, Iuran, Pendapatan Lain, Pengeluaran) untuk memulai dari nol?')) {
      return;
    }
    setIsResetting(true);
    try {
      await resetAllDataToEmpty();
      setDbNotice({ type: 'success', message: 'Semua data transaksi telah dikosongkan. Siap untuk pencatatan riil!' });
      setTimeout(() => setDbNotice(null), 5000);
    } catch (err) {
      setDbNotice({ type: 'error', message: 'Gagal mengosongkan data.' });
    } finally {
      setIsResetting(false);
    }
  };

  // Generate WhatsApp Monthly Broadcast Recap
  const generateMonthlyRecapMessage = () => {
    const totalIuran = payments
      .filter((p) => p.status === 'lunas')
      .reduce((acc, curr) => acc + curr.amount, 0);
    const totalOtherIncome = otherIncomes.reduce((acc, curr) => acc + curr.amount, 0);
    const totalIncome = totalIuran + totalOtherIncome;
    const totalExpense = expenses.reduce((acc, curr) => acc + curr.amount, 0);
    const balance = totalIncome - totalExpense;

    const monthPayments = payments.filter(
      (p) => p.periodMonth === currentPeriod && p.status === 'lunas'
    );
    const monthIuran = monthPayments.reduce((acc, curr) => acc + curr.amount, 0);
    const monthOther = otherIncomes
      .filter((inc) => inc.date.startsWith(currentPeriod))
      .reduce((acc, curr) => acc + curr.amount, 0);
    const monthTotalIncome = monthIuran + monthOther;

    const monthExpense = expenses
      .filter((e) => e.date.startsWith(currentPeriod))
      .reduce((acc, curr) => acc + curr.amount, 0);

    const paidHouses = new Set(monthPayments.map((p) => p.houseNumber));
    const occupiedCount = residents.filter((r) => r.occupancyStatus === 'dihuni').length || 1;

    return `📢 *LAPORAN KEUANGAN KAS ${formData.complexName.toUpperCase()}*
PAGUYUBAN WARGA ${formData.rtRw}
Periode: ${formatPeriodMonth(currentPeriod)}
================================
💰 *RINGKASAN KAS BULAN INI:*
• Pemasukan Iuran: ${formatRupiah(monthIuran)}
${monthOther > 0 ? `• Pendapatan Lain: ${formatRupiah(monthOther)}\n• Total Pemasukan: ${formatRupiah(monthTotalIncome)}\n` : ''}• Pengeluaran Kas: ${formatRupiah(monthExpense)}
• Warga Lunas: ${paidHouses.size} dari ${occupiedCount} Rumah (${Math.round((paidHouses.size / occupiedCount) * 100)}%)

💵 *TOTAL SALDO KAS RT SAAT INI:*
👉 *${formatRupiah(balance)}*
================================
💳 *REKENING KAS IURAN RT:*
Bank: ${formData.bankName}
No. Rekening: ${formData.bankAccount}
Atas Nama: ${formData.bankHolder}
Nominal Iuran: ${formatRupiah(formData.defaultMonthlyFee)} / bulan

Mohon bagi warga yang belum sempat melunasi iuran agar dapat melakukan transfer dan konfirmasi ke Bendahara RT (${formData.treasurerName} - ${formData.treasurerPhone}).

Terima kasih atas partisipasi dan kepedulian seluruh warga. 🙏✨`;
  };

  // Generate WhatsApp Payment Reminder
  const generateReminderMessage = () => {
    const monthPayments = payments.filter(
      (p) => p.periodMonth === currentPeriod && p.status === 'lunas'
    );
    const paidHouseNumbers = new Set(monthPayments.map((p) => p.houseNumber));
    const unpaidList = residents
      .filter((r) => r.occupancyStatus === 'dihuni' && !paidHouseNumbers.has(r.houseNumber))
      .map((r) => `• ${r.houseNumber} (${r.headOfFamily})`)
      .join('\n');

    return `🔔 *PENGINGAT IURAN KOMPLEK - ${formatPeriodMonth(currentPeriod).toUpperCase()}*
Kepada Yth. Bapak/Ibu Warga ${formData.complexName} (${formData.rtRw}),

Iuran wajib bulanan kebersihan & keamanan sebesar *${formatRupiah(formData.defaultMonthlyFee)}* untuk periode *${formatPeriodMonth(currentPeriod)}* telah dibuka.

Pembayaran dapat ditransfer melalui:
🏦 Bank: *${formData.bankName}*
🔢 No. Rek: *${formData.bankAccount}*
👤 A.N: *${formData.bankHolder}*

Bagi yang belum melunasi:
${unpaidList || 'Semua warga sudah lunas!'}

Setelah transfer, mohon kirim bukti pembayaran atau lapor mandiri di aplikasi iuran komplek.
Salam hangat,
Pengurus & Bendahara ${formData.rtRw}`;
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  const shareToWhatsApp = (text: string) => {
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">Pengaturan & Broadcast WA</h2>
        <p className="text-xs text-slate-500">
          Kelola profil komplek, nomor rekening kas, tarif iuran, dan format broadcast grup WhatsApp
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Form Settings */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="p-6 rounded-xl bg-white border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Building className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Profil Komplek & Tarif Iuran</h3>
              </div>
              {saveSuccess && (
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Tersimpan ke Database
                </span>
              )}
            </div>

            {userRole !== 'admin' && (
              <div className="p-3 rounded-lg bg-amber-50 text-amber-800 text-xs">
                Perhatian: Anda sedang dalam mode Warga. Anda dapat melihat informasi ini, namun perubahan hanya dapat disimpan oleh Pengurus (Admin).
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Komplek / Perumahan *
                </label>
                <input
                  type="text"
                  disabled={userRole !== 'admin'}
                  value={formData.complexName}
                  onChange={(e) => setFormData({ ...formData, complexName: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Wilayah RT / RW *
                </label>
                <input
                  type="text"
                  disabled={userRole !== 'admin'}
                  value={formData.rtRw}
                  onChange={(e) => setFormData({ ...formData, rtRw: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kelurahan / Desa / Kecamatan
                </label>
                <input
                  type="text"
                  disabled={userRole !== 'admin'}
                  value={formData.subDistrict}
                  onChange={(e) => setFormData({ ...formData, subDistrict: e.target.value })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Besaran Iuran Bulanan Default (Rp) *
                </label>
                <input
                  type="number"
                  disabled={userRole !== 'admin'}
                  min={1000}
                  step={5000}
                  value={formData.defaultMonthlyFee}
                  onChange={(e) => setFormData({ ...formData, defaultMonthlyFee: Number(e.target.value) })}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono disabled:bg-slate-50"
                />
              </div>
            </div>

            {/* Rekening Kas RT */}
            <div className="pt-3 border-t border-slate-100">
              <div className="flex items-center space-x-2 mb-3">
                <CreditCard className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Rekening Bank Penerimaan Kas RT
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Bank</label>
                  <input
                    type="text"
                    disabled={userRole !== 'admin'}
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    placeholder="BCA, Mandiri, BRI"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nomor Rekening</label>
                  <input
                    type="text"
                    disabled={userRole !== 'admin'}
                    value={formData.bankAccount}
                    onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono disabled:bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Atas Nama (A.N)</label>
                  <input
                    type="text"
                    disabled={userRole !== 'admin'}
                    value={formData.bankHolder}
                    onChange={(e) => setFormData({ ...formData, bankHolder: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
                  />
                </div>
              </div>
            </div>

            {/* Kontak & PIN Admin */}
            <div className="pt-3 border-t border-slate-100">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nama Bendahara / Pengurus
                  </label>
                  <input
                    type="text"
                    disabled={userRole !== 'admin'}
                    value={formData.treasurerName}
                    onChange={(e) => setFormData({ ...formData, treasurerName: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    No. WhatsApp Bendahara
                  </label>
                  <input
                    type="text"
                    disabled={userRole !== 'admin'}
                    value={formData.treasurerPhone}
                    onChange={(e) => setFormData({ ...formData, treasurerPhone: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono disabled:bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                    <span>PIN Keamanan Admin</span>
                  </label>
                  <input
                    type="text"
                    disabled={userRole !== 'admin'}
                    maxLength={6}
                    value={formData.adminPin}
                    onChange={(e) => setFormData({ ...formData, adminPin: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-center tracking-widest disabled:bg-slate-50"
                  />
                </div>
              </div>
            </div>

            {/* Pengumuman RT */}
            <div className="pt-3 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <Megaphone className="w-3.5 h-3.5 text-amber-600" />
                <span>Pengumuman / Agenda Komplek (Tampil di Dashboard)</span>
              </label>
              <textarea
                rows={2}
                disabled={userRole !== 'admin'}
                value={formData.announcement}
                onChange={(e) => setFormData({ ...formData, announcement: e.target.value })}
                placeholder="Tulis pengumuman kegiatan warga, gotong royong, fogging, dll..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50"
              />
            </div>

            {userRole === 'admin' && (
              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center space-x-2 px-5 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg shadow-sm transition"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Right Col: WhatsApp Broadcast Generator */}
        <div className="space-y-4">
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Generator Broadcast WhatsApp</h3>
                <p className="text-[11px] text-slate-500">Kirim update cepat ke grup warga</p>
              </div>
            </div>

            {/* Message 1: Rekap Bulanan */}
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">1. Laporan Kas Bulanan</span>
                <span className="text-[10px] bg-indigo-100 text-indigo-700 font-semibold px-2 py-0.5 rounded">
                  Format Siap Kirim
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Pemasukan, pengeluaran, sisa saldo kas dan persentase warga lunas.
              </p>
              <div className="flex space-x-2 pt-1">
                <button
                  onClick={() => copyToClipboard(generateMonthlyRecapMessage(), 'recap')}
                  className="flex-1 flex items-center justify-center space-x-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
                >
                  {copiedType === 'recap' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedType === 'recap' ? 'Disalin!' : 'Salin Pesan'}</span>
                </button>
                <button
                  onClick={() => shareToWhatsApp(generateMonthlyRecapMessage())}
                  className="flex items-center justify-center space-x-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Kirim WA</span>
                </button>
              </div>
            </div>

            {/* Message 2: Pengingat Iuran */}
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">2. Pengingat Iuran Bulan Ini</span>
                <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded">
                  Pengingat Ramah
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Ajakan pembayaran bulan berjalan lengkap dengan nomor rekening kas RT.
              </p>
              <div className="flex space-x-2 pt-1">
                <button
                  onClick={() => copyToClipboard(generateReminderMessage(), 'reminder')}
                  className="flex-1 flex items-center justify-center space-x-1 py-1.5 px-2.5 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
                >
                  {copiedType === 'reminder' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedType === 'reminder' ? 'Disalin!' : 'Salin Pesan'}</span>
                </button>
                <button
                  onClick={() => shareToWhatsApp(generateReminderMessage())}
                  className="flex items-center justify-center space-x-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Kirim WA</span>
                </button>
              </div>
            </div>
          </div>

          {/* Database System & Free Publishing Card */}
          <div className="p-5 rounded-xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
              <Database className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Status Database & Cadangan</h3>
                <p className="text-[11px] text-slate-500">100% Fitur Gratis & Tanpa Perlu Billing</p>
              </div>
            </div>

            {/* Notification alert */}
            {dbNotice && (
              <div
                className={`p-3 rounded-lg flex items-start space-x-2 text-xs font-medium ${
                  dbNotice.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {dbNotice.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                )}
                <span>{dbNotice.message}</span>
              </div>
            )}

            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Mode Penyimpanan:</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${dbInfo?.mode === 'firestore' ? 'bg-emerald-500' : 'bg-indigo-500'}`} />
                  {dbInfo?.mode === 'firestore' ? 'Cloud Firestore (Spark Free Tier)' : 'Penyimpanan Lokal'}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Batas Biaya (Billing):</span>
                <span className="font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded text-[11px]">
                  Bebas Biaya (Rp 0 / Gratis)
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">Terakhir Disinkron:</span>
                <span className="text-slate-600 font-mono text-[11px]">
                  {dbInfo?.lastSyncedAt || 'Aktif'}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                <div className="bg-white p-2 rounded border border-slate-200">
                  <div className="text-slate-500 text-[10px]">Warga</div>
                  <div className="font-bold text-slate-800">{residents.length}</div>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200">
                  <div className="text-slate-500 text-[10px]">Catatan Iuran</div>
                  <div className="font-bold text-slate-800">{payments.length}</div>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200">
                  <div className="text-slate-500 text-[10px]">Pendapatan Lain</div>
                  <div className="font-bold text-emerald-700">{otherIncomes.length}</div>
                </div>
                <div className="bg-white p-2 rounded border border-slate-200">
                  <div className="text-slate-500 text-[10px]">Pengeluaran</div>
                  <div className="font-bold text-rose-700">{expenses.length}</div>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleExportBackup}
                className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-indigo-600" />
                <span>Unduh Cadangan Database (.json)</span>
              </button>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportFile}
                accept=".json"
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition shadow-xs"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-600" />
                <span>Pulihkan Database dari Berkas (.json)</span>
              </button>

              {userRole === 'admin' && (
                <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handlePurgeDummyData}
                    disabled={isResetting}
                    className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 transition"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
                    <span>Hapus / Bersihkan Sisa Data Dummy</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClearAllData}
                    disabled={isResetting}
                    className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Kosongkan Semua Data Transaksi (Mulai Baru)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

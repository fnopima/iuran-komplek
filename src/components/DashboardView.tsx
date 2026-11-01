import React from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Megaphone,
  CheckCircle2,
  Clock,
  Send,
  PlusCircle,
  FileSpreadsheet,
  Coins,
} from 'lucide-react';
import type { Payment, Expense, Resident, AppSettings, UserRole, ActiveTab, OtherIncome } from '../types';
import { formatRupiah, formatPeriodMonth, getCurrentPeriodMonth, formatDateIndo } from '../lib/formatters';

interface DashboardViewProps {
  payments: Payment[];
  expenses: Expense[];
  residents: Resident[];
  otherIncomes?: OtherIncome[];
  settings: AppSettings;
  userRole: UserRole;
  onNavigateTab: (tab: ActiveTab) => void;
  onOpenSelfReport: () => void;
  onOpenNewPayment: () => void;
  onOpenNewOtherIncome?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  payments,
  expenses,
  residents,
  otherIncomes = [],
  settings,
  userRole,
  onNavigateTab,
  onOpenSelfReport,
  onOpenNewPayment,
  onOpenNewOtherIncome,
}) => {
  const currentPeriod = getCurrentPeriodMonth();

  // Financial calculations
  const totalIuranAllTime = payments
    .filter((p) => p.status === 'lunas')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalOtherIncomeAllTime = otherIncomes.reduce((acc, curr) => acc + curr.amount, 0);
  const totalIncomeAllTime = totalIuranAllTime + totalOtherIncomeAllTime;

  const totalExpenseAllTime = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const currentBalance = totalIncomeAllTime - totalExpenseAllTime;

  // Current month stats
  const currentMonthPayments = payments.filter(
    (p) => p.periodMonth === currentPeriod && p.status === 'lunas'
  );
  const currentMonthIuran = currentMonthPayments.reduce((acc, curr) => acc + curr.amount, 0);

  const currentMonthOtherIncomes = otherIncomes.filter((inc) => inc.date.startsWith(currentPeriod));
  const currentMonthOtherIncome = currentMonthOtherIncomes.reduce((acc, curr) => acc + curr.amount, 0);
  const currentMonthTotalIncome = currentMonthIuran + currentMonthOtherIncome;

  const currentMonthExpenses = expenses.filter((e) => e.date.startsWith(currentPeriod));
  const currentMonthExpense = currentMonthExpenses.reduce((acc, curr) => acc + curr.amount, 0);

  // House payment rate for current month
  const totalOccupiedHouses = residents.filter((r) => r.occupancyStatus === 'dihuni').length || 1;
  const paidHouseIds = new Set(currentMonthPayments.map((p) => p.houseNumber));
  const paidCount = paidHouseIds.size;
  const paymentPercentage = Math.min(100, Math.round((paidCount / totalOccupiedHouses) * 100));

  // Recent 5 activities
  const recentPayments = [...payments]
    .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime())
    .slice(0, 5);

  const unpaidResidents = residents
    .filter((r) => r.occupancyStatus === 'dihuni' && !paidHouseIds.has(r.houseNumber))
    .slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Announcement Banner */}
      {settings.announcement && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200/90 shadow-xs flex items-start space-x-3">
          <div className="p-2 rounded-lg bg-amber-100 text-amber-800 flex-shrink-0">
            <Megaphone className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
              Pengumuman Pengurus Paguyuban Komplek
            </h4>
            <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">{settings.announcement}</p>
          </div>
        </div>
      )}

      {/* Main KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Saldo Kas */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Saldo Kas RT</p>
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                <Wallet className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-1">{formatRupiah(currentBalance)}</p>
          </div>
          <div className="mt-3 flex items-center text-xs text-indigo-600 font-medium">
            <span>Akumulasi saldo kas bersih</span>
          </div>
        </div>

        {/* Pemasukan Bulan Ini */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Pemasukan ({formatPeriodMonth(currentPeriod).split(' ')[0]})
              </p>
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-1">{formatRupiah(currentMonthTotalIncome)}</p>
          </div>
          <div className="mt-3 text-xs text-slate-600 font-medium space-y-0.5">
            <div className="flex items-center text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1 shrink-0" />
              <span>Iuran: {formatRupiah(currentMonthIuran)} ({paidCount} rumah)</span>
            </div>
            {currentMonthOtherIncome > 0 && (
              <div className="flex items-center text-teal-700 text-[11px]">
                <Coins className="w-3 h-3 mr-1 shrink-0" />
                <span>Pendapatan Lain: {formatRupiah(currentMonthOtherIncome)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Pengeluaran Bulan Ini */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">
                Pengeluaran ({formatPeriodMonth(currentPeriod).split(' ')[0]})
              </p>
              <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
                <ArrowDownRight className="w-5 h-5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-rose-600 mt-1">{formatRupiah(currentMonthExpense)}</p>
          </div>
          <div className="mt-3 flex items-center text-xs text-slate-500 font-medium">
            <span>{currentMonthExpenses.length} transaksi keluar</span>
          </div>
        </div>

        {/* Tingkat Partisipasi Warga */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">Kepatuhan Iuran</p>
              <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-baseline space-x-2 mt-1">
              <p className="text-2xl font-bold text-slate-900">{paymentPercentage}%</p>
              <span className="text-xs text-slate-500 font-medium">
                ({paidCount}/{totalOccupiedHouses} Rumah)
              </span>
            </div>
          </div>
          <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${paymentPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Action Banners depending on role */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Quick action card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">
              Aksi Cepat
            </span>
            <h3 className="text-base font-bold text-slate-900 mt-2">
              {userRole === 'admin'
                ? 'Kelola & Catat Iuran Warga'
                : 'Lapor & Cek Status Iuran Rumah'}
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              {userRole === 'admin'
                ? 'Input penerimaan iuran tunai/transfer, terbitkan kuitansi digital resmi, dan verifikasi konfirmasi transfer warga.'
                : 'Sudah transfer iuran bulan ini? Laporkan bukti transfer untuk mendapatkan kuitansi digital resmi RT.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5 mt-5">
            {userRole === 'admin' ? (
              <>
                <button
                  onClick={onOpenNewPayment}
                  className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Input Pembayaran</span>
                </button>
                {onOpenNewOtherIncome && (
                  <button
                    onClick={onOpenNewOtherIncome}
                    className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition"
                  >
                    <Coins className="w-4 h-4" />
                    <span>+ Pendapatan Lain</span>
                  </button>
                )}
                <button
                  onClick={() => onNavigateTab('matrix')}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition"
                >
                  <FileSpreadsheet className="w-4 h-4 text-slate-500" />
                  <span>Buku Matriks</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onOpenSelfReport}
                  className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs transition"
                >
                  <Send className="w-4 h-4" />
                  <span>Konfirmasi Bayar Transfer</span>
                </button>
                <button
                  onClick={() => onNavigateTab('payments')}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition"
                >
                  <span>Cek Histori Rumah Saya</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Bank & Fee Summary Box */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Informasi Iuran Komplek
              </span>
              <span className="px-2.5 py-1 text-xs font-bold bg-indigo-50 text-indigo-700 rounded-lg">
                {formatRupiah(settings.defaultMonthlyFee)} / Bulan
              </span>
            </div>

            <div className="mt-4 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Rekening Kas RT:</span>
                <span className="font-semibold text-slate-800">
                  {settings.bankName} - <span className="font-mono text-indigo-600">{settings.bankAccount}</span>
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Atas Nama Rekening:</span>
                <span className="font-medium text-slate-800">{settings.bankHolder}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Kontak Bendahara RT:</span>
                <span className="font-medium text-slate-800">
                  {settings.treasurerName} ({settings.treasurerPhone})
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Periode Aktif: <strong>{formatPeriodMonth(currentPeriod)}</strong></span>
            <button
              onClick={() => onNavigateTab('payments')}
              className="text-indigo-600 hover:text-indigo-700 font-semibold"
            >
              Lihat Detail Iuran →
            </button>
          </div>
        </div>
      </div>

      {/* Grid for Recent Transactions & Unpaid List (Unpaid list only visible for admin) */}
      <div className={`grid grid-cols-1 ${userRole === 'admin' ? 'lg:grid-cols-2' : ''} gap-6`}>
        {/* Transaksi Terkini */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-800">Transaksi Iuran Terkini</h3>
              <p className="text-xs text-slate-500">Catatan pembayaran warga terbaru</p>
            </div>
            <button
              onClick={() => onNavigateTab('payments')}
              className="text-indigo-600 text-xs font-semibold hover:text-indigo-700"
            >
              Lihat Semua
            </button>
          </div>

          <div className="p-4 space-y-2.5 flex-1">
            {recentPayments.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center">Belum ada catatan pembayaran</p>
            ) : (
              recentPayments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100/70 transition"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-8 h-8 rounded flex items-center justify-center text-xs font-bold ${
                        p.status === 'lunas'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {p.houseNumber.replace('Blok ', '')}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{p.headOfFamily}</p>
                      <p className="text-[11px] text-slate-500">
                        {p.houseNumber} • {formatPeriodMonth(p.periodMonth)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-900">{formatRupiah(p.amount)}</p>
                    <span
                      className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        p.status === 'lunas'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {p.status === 'lunas' ? 'Lunas' : 'Pending'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Status Menunggak Bulan Ini - Hanya untuk Admin */}
        {userRole === 'admin' && (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-800">
                  Belum Bayar Bulan Ini ({formatPeriodMonth(currentPeriod).split(' ')[0]})
                </h3>
                <p className="text-xs text-slate-500">Daftar rumah berpenghuni yang belum lunas</p>
              </div>
              <button
                onClick={() => onNavigateTab('matrix')}
                className="text-indigo-600 text-xs font-semibold hover:text-indigo-700"
              >
                Cek Buku Matriks
              </button>
            </div>

            <div className="p-4 space-y-2.5 flex-1">
              {unpaidResidents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2" />
                  <p className="text-xs font-bold text-slate-800">Luar Biasa!</p>
                  <p className="text-xs text-slate-500">Semua warga telah melunasi iuran bulan ini.</p>
                </div>
              ) : (
                unpaidResidents.map((res) => (
                  <div
                    key={res.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-rose-50/50 border border-rose-100/80"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded bg-rose-100 text-rose-700 flex items-center justify-center text-xs font-bold">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{res.houseNumber}</p>
                        <p className="text-[11px] text-slate-600">{res.headOfFamily}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-rose-600">
                        {formatRupiah(settings.defaultMonthlyFee)}
                      </span>
                      <p className="text-[10px] text-slate-400">Belum Bayar</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

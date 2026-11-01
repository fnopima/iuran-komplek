import React from 'react';
import {
  ShieldCheck,
  User,
  LayoutDashboard,
  Receipt,
  Grid3X3,
  Users,
  WalletCards,
  Coins,
  Settings as SettingsIcon,
  Wifi,
  Lock,
  HardDrive,
} from 'lucide-react';
import type { ActiveTab, UserRole, AppSettings, DatabaseInfo } from '../types';

interface HeaderProps {
  currentTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  userRole: UserRole;
  onChangeRole: (role: UserRole) => void;
  onOpenPinModal: () => void;
  settings: AppSettings;
  pendingVerificationCount: number;
  dbInfo?: DatabaseInfo;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onSelectTab,
  userRole,
  onChangeRole,
  onOpenPinModal,
  settings,
  pendingVerificationCount,
  dbInfo,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Ringkasan Kas', icon: LayoutDashboard },
    {
      id: 'payments',
      label: 'Catatan Iuran',
      icon: Receipt,
      badge: pendingVerificationCount > 0 ? pendingVerificationCount : undefined,
    },
    { id: 'other_incomes', label: 'Pendapatan Lain', icon: Coins },
    { id: 'matrix', label: 'Buku Matriks', icon: Grid3X3 },
    { id: 'residents', label: 'Data Warga', icon: Users },
    { id: 'expenses', label: 'Pengeluaran', icon: WalletCards },
    { id: 'settings', label: 'Pengaturan', icon: SettingsIcon },
  ];

  const isCloud = dbInfo?.mode === 'firestore';

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs backdrop-blur-md">
      {/* Top Banner with Branding and Role Switcher */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm flex-shrink-0">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                {settings.complexName || 'Pencatatan Iuran Komplek'}
              </h1>
              {isCloud ? (
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/70" title="Firestore Spark Free Tier (Bebas Biaya)">
                  <Wifi className="w-3 h-3 text-emerald-500 animate-pulse" />
                  Cloud Real-time (Gratis Spark)
                </span>
              ) : (
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200" title="Penyimpanan Lokal Aktif">
                  <HardDrive className="w-3 h-3 text-indigo-500" />
                  Penyimpanan Lokal (100% Gratis)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {settings.rtRw} • Sistem Pencatatan & Transparansi Keuangan Warga
            </p>
          </div>
        </div>

        {/* Role Switcher */}
        <div className="flex items-center space-x-2.5 self-start md:self-auto flex-wrap gap-y-2">
          {userRole === 'admin' ? (
            <div className="flex items-center space-x-2 bg-indigo-50/80 border border-indigo-200/80 p-1 pl-3 rounded-lg">
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-indigo-900">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Pengurus (Admin)</span>
              </div>
              <button
                onClick={() => onChangeRole('warga')}
                className="px-2.5 py-1 text-xs font-medium text-slate-600 bg-white hover:bg-slate-100 rounded-md border border-slate-200 shadow-2xs transition"
              >
                Beralih ke Warga
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2 bg-slate-100 border border-slate-200 p-1 pl-3 rounded-lg">
              <div className="flex items-center space-x-1.5 text-xs font-semibold text-slate-700">
                <User className="w-4 h-4 text-slate-500" />
                <span>Warga Komplek</span>
              </div>
              <button
                onClick={onOpenPinModal}
                className="flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-md shadow-2xs transition"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Masuk Admin</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-slate-100">
        <nav className="flex space-x-1 overflow-x-auto py-2 scrollbar-none" aria-label="Tabs">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id as ActiveTab)}
                className={`flex items-center space-x-2 px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors relative ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};

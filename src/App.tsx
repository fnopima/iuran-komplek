import React, { useState, useEffect } from 'react';
import {
  initializeDatabase,
  subscribeSettings,
  subscribeResidents,
  subscribePayments,
  subscribeExpenses,
  subscribeOtherIncomes,
  subscribeDbInfo,
} from './lib/database';
import { DEFAULT_SETTINGS } from './lib/initialData';
import type {
  Resident,
  Payment,
  Expense,
  OtherIncome,
  AppSettings,
  ActiveTab,
  UserRole,
  DatabaseInfo,
} from './types';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { PaymentsView } from './components/PaymentsView';
import { OtherIncomesView } from './components/OtherIncomesView';
import { MatrixView } from './components/MatrixView';
import { ResidentsView } from './components/ResidentsView';
import { ExpensesView } from './components/ExpensesView';
import { SettingsView } from './components/SettingsView';
import { ReceiptModal } from './components/ReceiptModal';
import { AdminPinModal } from './components/AdminPinModal';
import { LoginGateModal } from './components/LoginGateModal';
import { SelfReportModal } from './components/SelfReportModal';
import { NewPaymentModal } from './components/NewPaymentModal';
import { NewOtherIncomeModal } from './components/NewOtherIncomeModal';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('iuran_komplek_authenticated') === 'true';
  });
  const [userRole, setUserRole] = useState<UserRole>(() => {
    const saved = sessionStorage.getItem('iuran_komplek_auth_role');
    return saved === 'admin' || saved === 'warga' ? (saved as UserRole) : 'warga';
  });
  const [currentTab, setCurrentTab] = useState<ActiveTab>('dashboard');
  const [residents, setResidents] = useState<Resident[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [otherIncomes, setOtherIncomes] = useState<OtherIncome[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [dbInfo, setDbInfo] = useState<DatabaseInfo>({
    mode: 'firestore',
    isOnline: true,
    firestoreConfigured: true,
  });

  // Modals
  const [isNewPaymentOpen, setIsNewPaymentOpen] = useState(false);
  const [quickPayResidentId, setQuickPayResidentId] = useState('');
  const [quickPayPeriodMonth, setQuickPayPeriodMonth] = useState('');
  const [isNewOtherIncomeOpen, setIsNewOtherIncomeOpen] = useState(false);
  const [isSelfReportOpen, setIsSelfReportOpen] = useState(false);
  const [isAdminPinOpen, setIsAdminPinOpen] = useState(false);
  const [receiptPayment, setReceiptPayment] = useState<Payment | null>(null);

  // Initialize unified database engine (Cloud Firestore + LocalStorage fallback)
  useEffect(() => {
    let isMounted = true;

    initializeDatabase().then(() => {
      if (isMounted) {
        setIsLoading(false);
      }
    });

    const unsubSettings = subscribeSettings((data) => setSettings(data));
    const unsubResidents = subscribeResidents((data) => setResidents(data));
    const unsubPayments = subscribePayments((data) => setPayments(data));
    const unsubExpenses = subscribeExpenses((data) => setExpenses(data));
    const unsubOtherIncomes = subscribeOtherIncomes((data) => setOtherIncomes(data));
    const unsubDbInfo = subscribeDbInfo((info) => setDbInfo(info));

    return () => {
      isMounted = false;
      unsubSettings();
      unsubResidents();
      unsubPayments();
      unsubExpenses();
      unsubOtherIncomes();
      unsubDbInfo();
    };
  }, []);

  const pendingVerificationCount = payments.filter((p) => p.status === 'pending').length;

  // Auto redirect away from settings or residents if non-admin
  useEffect(() => {
    if (userRole !== 'admin' && (currentTab === 'settings' || currentTab === 'residents')) {
      setCurrentTab('dashboard');
    }
  }, [userRole, currentTab]);

  const handleRoleChange = (role: UserRole) => {
    setUserRole(role);
    sessionStorage.setItem('iuran_komplek_auth_role', role);
    if (role !== 'admin' && (currentTab === 'settings' || currentTab === 'residents')) {
      setCurrentTab('dashboard');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('iuran_komplek_authenticated');
    sessionStorage.removeItem('iuran_komplek_auth_role');
    setIsAuthenticated(false);
  };

  return (
    <div className="min-h-screen bg-[#f8faf8] text-slate-900 flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      <Header
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        userRole={userRole}
        onChangeRole={handleRoleChange}
        onOpenPinModal={() => setIsAdminPinOpen(true)}
        settings={settings}
        pendingVerificationCount={pendingVerificationCount}
        dbInfo={dbInfo}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isLoading && residents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-xs font-medium text-slate-500">
              Memuat database kas komplek...
            </p>
          </div>
        ) : (
          <>
            {currentTab === 'dashboard' && (
              <DashboardView
                payments={payments}
                expenses={expenses}
                residents={residents}
                otherIncomes={otherIncomes}
                settings={settings}
                userRole={userRole}
                onNavigateTab={(tab) => setCurrentTab(tab)}
                onOpenSelfReport={() => setIsSelfReportOpen(true)}
                onOpenNewPayment={() => {
                  setQuickPayResidentId('');
                  setQuickPayPeriodMonth('');
                  setIsNewPaymentOpen(true);
                }}
                onOpenNewOtherIncome={() => setIsNewOtherIncomeOpen(true)}
              />
            )}

            {currentTab === 'payments' && (
              <PaymentsView
                payments={payments}
                residents={residents}
                settings={settings}
                userRole={userRole}
                onOpenNewPayment={() => {
                  setQuickPayResidentId('');
                  setQuickPayPeriodMonth('');
                  setIsNewPaymentOpen(true);
                }}
                onOpenSelfReport={() => setIsSelfReportOpen(true)}
                onViewReceipt={(payment) => setReceiptPayment(payment)}
              />
            )}

            {currentTab === 'other_incomes' && (
              <OtherIncomesView
                otherIncomes={otherIncomes}
                userRole={userRole}
                settings={settings}
                onOpenNewIncomeModal={() => {
                  if (userRole === 'admin') {
                    setIsNewOtherIncomeOpen(true);
                  }
                }}
              />
            )}

            {currentTab === 'matrix' && (
              <MatrixView
                residents={residents}
                payments={payments}
                settings={settings}
                userRole={userRole}
                onQuickPay={(resident, periodMonth) => {
                  setQuickPayResidentId(resident.id);
                  setQuickPayPeriodMonth(periodMonth);
                  setIsNewPaymentOpen(true);
                }}
                onViewReceipt={(payment) => setReceiptPayment(payment)}
              />
            )}

            {currentTab === 'residents' && userRole === 'admin' && (
              <ResidentsView
                residents={residents}
                userRole={userRole}
              />
            )}

            {currentTab === 'expenses' && (
              <ExpensesView
                expenses={expenses}
                userRole={userRole}
                settings={settings}
              />
            )}

            {currentTab === 'settings' && userRole === 'admin' && (
              <SettingsView
                settings={settings}
                userRole={userRole}
                payments={payments}
                expenses={expenses}
                residents={residents}
                otherIncomes={otherIncomes}
                dbInfo={dbInfo}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            {settings.complexName} • {settings.rtRw}
          </p>
          <p className="text-[11px] text-slate-400">
            Sistem Informasi & Transparansi Keuangan Kas Paguyuban Warga
          </p>
        </div>
      </footer>

      {/* Modals */}
      <LoginGateModal
        isOpen={!isAuthenticated}
        onSuccess={(role) => {
          setUserRole(role);
          setIsAuthenticated(true);
          sessionStorage.setItem('iuran_komplek_authenticated', 'true');
          sessionStorage.setItem('iuran_komplek_auth_role', role);
        }}
        settings={settings}
        dbInfo={dbInfo}
      />

      <AdminPinModal
        isOpen={isAdminPinOpen}
        onClose={() => setIsAdminPinOpen(false)}
        onSuccess={() => {
          handleRoleChange('admin');
          setIsAdminPinOpen(false);
        }}
        correctPin={settings.adminPin || '1234'}
      />

      <ReceiptModal
        payment={receiptPayment}
        settings={settings}
        residents={residents}
        onClose={() => setReceiptPayment(null)}
      />

      <NewPaymentModal
        isOpen={isNewPaymentOpen}
        onClose={() => {
          setIsNewPaymentOpen(false);
          setQuickPayResidentId('');
          setQuickPayPeriodMonth('');
        }}
        residents={residents}
        settings={settings}
        initialResidentId={quickPayResidentId}
        initialPeriodMonth={quickPayPeriodMonth}
        onSuccess={() => {
          setIsNewPaymentOpen(false);
          setQuickPayResidentId('');
          setQuickPayPeriodMonth('');
        }}
      />

      {userRole === 'admin' && (
        <NewOtherIncomeModal
          isOpen={isNewOtherIncomeOpen}
          onClose={() => setIsNewOtherIncomeOpen(false)}
          userRole={userRole}
          onSuccess={() => {
            setIsNewOtherIncomeOpen(false);
          }}
        />
      )}

      <SelfReportModal
        isOpen={isSelfReportOpen}
        onClose={() => setIsSelfReportOpen(false)}
        residents={residents}
        settings={settings}
        onSuccess={() => {
          setIsSelfReportOpen(false);
        }}
      />
    </div>
  );
}

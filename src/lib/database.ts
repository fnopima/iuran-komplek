import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
} from 'firebase/firestore';
import { db, auth, testFirebaseConnection } from './firebase';
import { DEFAULT_SETTINGS } from './initialData';
import type {
  Resident,
  Payment,
  Expense,
  OtherIncome,
  AppSettings,
  DatabaseInfo,
} from '../types';

// Keys for LocalStorage
const STORAGE_KEYS = {
  SETTINGS: 'iuran_komplek_settings',
  RESIDENTS: 'iuran_komplek_residents',
  PAYMENTS: 'iuran_komplek_payments',
  EXPENSES: 'iuran_komplek_expenses',
  OTHER_INCOMES: 'iuran_komplek_other_incomes',
  DB_MODE: 'iuran_komplek_db_mode',
};

// Error handling per Firebase Skill requirements
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): FirestoreErrorInfo {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo:
        auth?.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.warn('Firestore Warning/Fallback Triggered:', JSON.stringify(errInfo));
  return errInfo;
}

// In-Memory state caches
let currentSettings: AppSettings = DEFAULT_SETTINGS;
let currentResidents: Resident[] = [];
let currentPayments: Payment[] = [];
let currentExpenses: Expense[] = [];
let currentOtherIncomes: OtherIncome[] = [];

let currentDbInfo: DatabaseInfo = {
  mode: 'firestore',
  isOnline: true,
  firestoreConfigured: true,
  lastSyncedAt: new Date().toLocaleTimeString('id-ID'),
};

// Listeners
type Listener<T> = (data: T) => void;
const settingsListeners: Set<Listener<AppSettings>> = new Set();
const residentsListeners: Set<Listener<Resident[]>> = new Set();
const paymentsListeners: Set<Listener<Payment[]>> = new Set();
const expensesListeners: Set<Listener<Expense[]>> = new Set();
const otherIncomesListeners: Set<Listener<OtherIncome[]>> = new Set();
const dbInfoListeners: Set<Listener<DatabaseInfo>> = new Set();

function notifyDbInfo() {
  dbInfoListeners.forEach((cb) => cb({ ...currentDbInfo }));
}

function notifySettings() {
  settingsListeners.forEach((cb) => cb({ ...currentSettings }));
}

function notifyResidents() {
  residentsListeners.forEach((cb) => cb([...currentResidents]));
}

function notifyPayments() {
  paymentsListeners.forEach((cb) => cb([...currentPayments]));
}

function notifyExpenses() {
  expensesListeners.forEach((cb) => cb([...currentExpenses]));
}

function notifyOtherIncomes() {
  otherIncomesListeners.forEach((cb) => cb([...currentOtherIncomes]));
}

// LocalStorage helpers
function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (e) {
    console.warn(`Error reading ${key} from localStorage:`, e);
    return fallback;
  }
}

function writeLocal<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Error writing ${key} to localStorage:`, e);
  }
}

// Identification of known sample/dummy data to purge
const DUMMY_HEADS = new Set([
  'Bpk. Hendra Gunawan',
  'Ibu Ratna Sari',
  'Bpk. Bambang Pamungkas',
  'Bpk. Dedi Kusnandar',
  'Ibu Siti Nurhaliza',
  'Bpk. Eko Prasetyo',
  'Bpk. Surya Wijaya',
  'Bpk. Agus Santoso',
  'Ibu Maya Anggraini',
  'Bpk. Rian Pratama',
]);

const DUMMY_EXPENSE_TITLES = new Set([
  'Honorarium Petugas Satpam (2 Orang)',
  'Retribusi Angkut Sampah Komplek',
  'Penggantian Bohlam Lampu PJU Blok B',
]);

function isDummyResident(r: Resident): boolean {
  if (r.id.startsWith('res-local-') || r.id.startsWith('res-seed-')) return true;
  if (DUMMY_HEADS.has(r.headOfFamily)) return true;
  return false;
}

function isDummyPayment(p: Payment): boolean {
  if (p.id.startsWith('pay-local-') || p.id.startsWith('pay-seed-')) return true;
  if (p.residentId.startsWith('res-local-') || p.residentId.startsWith('res-seed-')) return true;
  if (DUMMY_HEADS.has(p.headOfFamily)) return true;
  if (p.receiptNo.startsWith('KWT-202609-100') || p.receiptNo.startsWith('KWT-202608-090')) return true;
  return false;
}

function isDummyExpense(e: Expense): boolean {
  if (e.id.startsWith('exp-local-') || e.id.startsWith('exp-seed-')) return true;
  if (DUMMY_EXPENSE_TITLES.has(e.title)) return true;
  return false;
}

// Clean local storage from any previous dummy data
function sanitizeAndLoadLocalStorage(): void {
  const rawResidents = readLocal<Resident[]>(STORAGE_KEYS.RESIDENTS, []);
  const cleanResidents = rawResidents.filter((r) => !isDummyResident(r));
  writeLocal(STORAGE_KEYS.RESIDENTS, cleanResidents);
  currentResidents = cleanResidents;

  const rawPayments = readLocal<Payment[]>(STORAGE_KEYS.PAYMENTS, []);
  const cleanPayments = rawPayments.filter((p) => !isDummyPayment(p));
  writeLocal(STORAGE_KEYS.PAYMENTS, cleanPayments);
  currentPayments = cleanPayments;

  const rawExpenses = readLocal<Expense[]>(STORAGE_KEYS.EXPENSES, []);
  const cleanExpenses = rawExpenses.filter((e) => !isDummyExpense(e));
  writeLocal(STORAGE_KEYS.EXPENSES, cleanExpenses);
  currentExpenses = cleanExpenses;

  const rawOtherIncomes = readLocal<OtherIncome[]>(STORAGE_KEYS.OTHER_INCOMES, []);
  currentOtherIncomes = rawOtherIncomes;

  const rawSettings = readLocal<AppSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  currentSettings = {
    ...DEFAULT_SETTINGS,
    ...rawSettings,
    wargaPassword: rawSettings.wargaPassword || DEFAULT_SETTINGS.wargaPassword || 'andara',
  };
}

// Initialize Database system
let isInitialized = false;
export async function initializeDatabase(): Promise<void> {
  if (isInitialized) return;
  isInitialized = true;

  // Step 1: Pre-load and purge dummy data from local persistent storage
  sanitizeAndLoadLocalStorage();
  notifySettings();
  notifyResidents();
  notifyPayments();
  notifyExpenses();
  notifyOtherIncomes();

  // Step 2: Test Cloud Firestore connection (Spark Free Tier)
  let isFirestoreConnected = false;
  try {
    isFirestoreConnected = await testFirebaseConnection();
  } catch (err) {
    console.warn('Firebase connection check failed, using Local Storage fallback:', err);
    isFirestoreConnected = false;
  }

  if (!isFirestoreConnected) {
    currentDbInfo = {
      mode: 'local',
      isOnline: false,
      firestoreConfigured: false,
      lastSyncedAt: new Date().toLocaleTimeString('id-ID'),
      errorMessage: 'Berjalan dalam mode penyimpanan lokal (100% Bebas Biaya/Gratis).',
    };
    notifyDbInfo();
    return;
  }

  // Step 3: Attach Firestore real-time onSnapshot listeners
  try {
    // 1. Settings listener
    onSnapshot(
      doc(db, 'settings', 'general'),
      (snap) => {
        if (snap.exists()) {
          const rawData = snap.data() as AppSettings;
          currentSettings = {
            ...DEFAULT_SETTINGS,
            ...rawData,
            wargaPassword: rawData.wargaPassword || DEFAULT_SETTINGS.wargaPassword || 'andara',
          };
          writeLocal(STORAGE_KEYS.SETTINGS, currentSettings);
          notifySettings();
        } else {
          setDoc(doc(db, 'settings', 'general'), currentSettings).catch((e) =>
            handleFirestoreError(e, OperationType.WRITE, 'settings/general')
          );
        }
        currentDbInfo.lastSyncedAt = new Date().toLocaleTimeString('id-ID');
        notifyDbInfo();
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'settings/general');
        fallbackToLocalMode('Gagal sinkronisasi pengaturan cloud.');
      }
    );

    // 2. Residents listener
    onSnapshot(
      collection(db, 'residents'),
      async (snap) => {
        const list: Resident[] = [];
        const dummyDocsToDelete: string[] = [];

        snap.forEach((d) => {
          const item = { id: d.id, ...d.data() } as Resident;
          if (isDummyResident(item)) {
            dummyDocsToDelete.push(d.id);
          } else {
            list.push(item);
          }
        });

        // Auto-purge dummy records in Firestore if found
        if (dummyDocsToDelete.length > 0) {
          dummyDocsToDelete.forEach((id) => {
            deleteDoc(doc(db, 'residents', id)).catch(() => {});
          });
        }

        list.sort((a, b) => a.houseNumber.localeCompare(b.houseNumber));
        currentResidents = list;
        writeLocal(STORAGE_KEYS.RESIDENTS, list);
        notifyResidents();

        currentDbInfo.lastSyncedAt = new Date().toLocaleTimeString('id-ID');
        notifyDbInfo();
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'residents');
        fallbackToLocalMode('Gagal sinkronisasi data warga cloud.');
      }
    );

    // 3. Payments listener
    onSnapshot(
      collection(db, 'payments'),
      async (snap) => {
        const list: Payment[] = [];
        const dummyDocsToDelete: string[] = [];

        snap.forEach((d) => {
          const item = { id: d.id, ...d.data() } as Payment;
          if (isDummyPayment(item)) {
            dummyDocsToDelete.push(d.id);
          } else {
            list.push(item);
          }
        });

        if (dummyDocsToDelete.length > 0) {
          dummyDocsToDelete.forEach((id) => {
            deleteDoc(doc(db, 'payments', id)).catch(() => {});
          });
        }

        currentPayments = list;
        writeLocal(STORAGE_KEYS.PAYMENTS, list);
        notifyPayments();

        currentDbInfo.lastSyncedAt = new Date().toLocaleTimeString('id-ID');
        notifyDbInfo();
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'payments');
        fallbackToLocalMode('Gagal sinkronisasi catatan iuran cloud.');
      }
    );

    // 4. Expenses listener
    onSnapshot(
      collection(db, 'expenses'),
      async (snap) => {
        const list: Expense[] = [];
        const dummyDocsToDelete: string[] = [];

        snap.forEach((d) => {
          const item = { id: d.id, ...d.data() } as Expense;
          if (isDummyExpense(item)) {
            dummyDocsToDelete.push(d.id);
          } else {
            list.push(item);
          }
        });

        if (dummyDocsToDelete.length > 0) {
          dummyDocsToDelete.forEach((id) => {
            deleteDoc(doc(db, 'expenses', id)).catch(() => {});
          });
        }

        currentExpenses = list;
        writeLocal(STORAGE_KEYS.EXPENSES, list);
        notifyExpenses();

        currentDbInfo.lastSyncedAt = new Date().toLocaleTimeString('id-ID');
        notifyDbInfo();
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'expenses');
        fallbackToLocalMode('Gagal sinkronisasi pengeluaran cloud.');
      }
    );

    // 5. OtherIncomes listener (Pendapatan di luar iuran warga)
    onSnapshot(
      collection(db, 'otherIncomes'),
      (snap) => {
        const list: OtherIncome[] = [];
        snap.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as OtherIncome);
        });

        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        currentOtherIncomes = list;
        writeLocal(STORAGE_KEYS.OTHER_INCOMES, list);
        notifyOtherIncomes();

        currentDbInfo.lastSyncedAt = new Date().toLocaleTimeString('id-ID');
        notifyDbInfo();
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'otherIncomes');
        fallbackToLocalMode('Gagal sinkronisasi pendapatan lain cloud.');
      }
    );

    currentDbInfo = {
      mode: 'firestore',
      isOnline: true,
      firestoreConfigured: true,
      lastSyncedAt: new Date().toLocaleTimeString('id-ID'),
    };
    notifyDbInfo();
  } catch (err) {
    fallbackToLocalMode('Penyimpanan cloud dialihkan ke mode lokal.');
  }
}

function fallbackToLocalMode(reason: string) {
  currentDbInfo = {
    mode: 'local',
    isOnline: false,
    firestoreConfigured: false,
    lastSyncedAt: new Date().toLocaleTimeString('id-ID'),
    errorMessage: reason,
  };
  notifyDbInfo();
}

// -------------------------------------------------------------
// SUBSCRIPTIONS
// -------------------------------------------------------------
export function subscribeSettings(cb: Listener<AppSettings>): () => void {
  settingsListeners.add(cb);
  cb({ ...currentSettings });
  return () => settingsListeners.delete(cb);
}

export function subscribeResidents(cb: Listener<Resident[]>): () => void {
  residentsListeners.add(cb);
  cb([...currentResidents]);
  return () => residentsListeners.delete(cb);
}

export function subscribePayments(cb: Listener<Payment[]>): () => void {
  paymentsListeners.add(cb);
  cb([...currentPayments]);
  return () => paymentsListeners.delete(cb);
}

export function subscribeExpenses(cb: Listener<Expense[]>): () => void {
  expensesListeners.add(cb);
  cb([...currentExpenses]);
  return () => expensesListeners.delete(cb);
}

export function subscribeOtherIncomes(cb: Listener<OtherIncome[]>): () => void {
  otherIncomesListeners.add(cb);
  cb([...currentOtherIncomes]);
  return () => otherIncomesListeners.delete(cb);
}

export function subscribeDbInfo(cb: Listener<DatabaseInfo>): () => void {
  dbInfoListeners.add(cb);
  cb({ ...currentDbInfo });
  return () => dbInfoListeners.delete(cb);
}

export function getDatabaseInfo(): DatabaseInfo {
  return { ...currentDbInfo };
}

// -------------------------------------------------------------
// CRUD OPERATIONS (Dual Sync: Firestore + LocalStorage)
// -------------------------------------------------------------

// Settings
export async function updateAppSettings(newSettings: AppSettings): Promise<void> {
  currentSettings = newSettings;
  writeLocal(STORAGE_KEYS.SETTINGS, newSettings);
  notifySettings();

  if (currentDbInfo.mode === 'firestore') {
    try {
      await setDoc(doc(db, 'settings', 'general'), newSettings);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'settings/general');
    }
  }
}

// Residents
export async function addResident(data: Omit<Resident, 'id'>): Promise<string> {
  const newId = `res-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const fullResident: Resident = {
    id: newId,
    ...data,
  };

  currentResidents = [...currentResidents, fullResident].sort((a, b) =>
    a.houseNumber.localeCompare(b.houseNumber)
  );
  writeLocal(STORAGE_KEYS.RESIDENTS, currentResidents);
  notifyResidents();

  if (currentDbInfo.mode === 'firestore') {
    try {
      await setDoc(doc(db, 'residents', newId), fullResident);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `residents/${newId}`);
    }
  }

  return newId;
}

export async function updateResident(id: string, data: Partial<Resident>): Promise<void> {
  currentResidents = currentResidents.map((r) => (r.id === id ? { ...r, ...data } : r));
  writeLocal(STORAGE_KEYS.RESIDENTS, currentResidents);
  notifyResidents();

  if (currentDbInfo.mode === 'firestore') {
    try {
      await updateDoc(doc(db, 'residents', id), data);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `residents/${id}`);
    }
  }
}

export async function deleteResident(id: string): Promise<void> {
  currentResidents = currentResidents.filter((r) => r.id !== id);
  writeLocal(STORAGE_KEYS.RESIDENTS, currentResidents);
  notifyResidents();

  if (currentDbInfo.mode === 'firestore') {
    try {
      await deleteDoc(doc(db, 'residents', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `residents/${id}`);
    }
  }
}

// Payments
export async function addPayment(data: Omit<Payment, 'id'>): Promise<string> {
  const newId = `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const fullPayment: Payment = {
    id: newId,
    ...data,
  };

  currentPayments = [fullPayment, ...currentPayments];
  writeLocal(STORAGE_KEYS.PAYMENTS, currentPayments);
  notifyPayments();

  if (currentDbInfo.mode === 'firestore') {
    try {
      await setDoc(doc(db, 'payments', newId), fullPayment);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `payments/${newId}`);
    }
  }

  return newId;
}

export async function updatePayment(id: string, data: Partial<Payment>): Promise<void> {
  currentPayments = currentPayments.map((p) => (p.id === id ? { ...p, ...data } : p));
  writeLocal(STORAGE_KEYS.PAYMENTS, currentPayments);
  notifyPayments();

  if (currentDbInfo.mode === 'firestore') {
    try {
      await updateDoc(doc(db, 'payments', id), data);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `payments/${id}`);
    }
  }
}

export async function deletePayment(id: string): Promise<void> {
  currentPayments = currentPayments.filter((p) => p.id !== id);
  writeLocal(STORAGE_KEYS.PAYMENTS, currentPayments);
  notifyPayments();

  if (currentDbInfo.mode === 'firestore') {
    try {
      await deleteDoc(doc(db, 'payments', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `payments/${id}`);
    }
  }
}

// Expenses
export async function addExpense(data: Omit<Expense, 'id'>): Promise<string> {
  const newId = `exp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const fullExpense: Expense = {
    id: newId,
    ...data,
  };

  currentExpenses = [fullExpense, ...currentExpenses];
  writeLocal(STORAGE_KEYS.EXPENSES, currentExpenses);
  notifyExpenses();

  if (currentDbInfo.mode === 'firestore') {
    try {
      await setDoc(doc(db, 'expenses', newId), fullExpense);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `expenses/${newId}`);
    }
  }

  return newId;
}

export async function updateExpense(id: string, data: Partial<Expense>): Promise<void> {
  currentExpenses = currentExpenses.map((e) => (e.id === id ? { ...e, ...data } : e));
  writeLocal(STORAGE_KEYS.EXPENSES, currentExpenses);
  notifyExpenses();

  if (currentDbInfo.mode === 'firestore') {
    try {
      await updateDoc(doc(db, 'expenses', id), data);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `expenses/${id}`);
    }
  }
}

export async function deleteExpense(id: string): Promise<void> {
  currentExpenses = currentExpenses.filter((e) => e.id !== id);
  writeLocal(STORAGE_KEYS.EXPENSES, currentExpenses);
  notifyExpenses();

  if (currentDbInfo.mode === 'firestore') {
    try {
      await deleteDoc(doc(db, 'expenses', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `expenses/${id}`);
    }
  }
}

// Other Incomes (Pendapatan di Luar Iuran Warga)
export async function addOtherIncome(data: Omit<OtherIncome, 'id'>): Promise<string> {
  const newId = `inc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const fullIncome: OtherIncome = {
    id: newId,
    createdAt: new Date().toISOString(),
    ...data,
  };

  currentOtherIncomes = [fullIncome, ...currentOtherIncomes];
  writeLocal(STORAGE_KEYS.OTHER_INCOMES, currentOtherIncomes);
  notifyOtherIncomes();

  if (currentDbInfo.mode === 'firestore') {
    try {
      await setDoc(doc(db, 'otherIncomes', newId), fullIncome);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `otherIncomes/${newId}`);
    }
  }

  return newId;
}

export async function updateOtherIncome(id: string, data: Partial<OtherIncome>): Promise<void> {
  currentOtherIncomes = currentOtherIncomes.map((inc) => (inc.id === id ? { ...inc, ...data } : inc));
  writeLocal(STORAGE_KEYS.OTHER_INCOMES, currentOtherIncomes);
  notifyOtherIncomes();

  if (currentDbInfo.mode === 'firestore') {
    try {
      await updateDoc(doc(db, 'otherIncomes', id), data);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `otherIncomes/${id}`);
    }
  }
}

export async function deleteOtherIncome(id: string): Promise<void> {
  currentOtherIncomes = currentOtherIncomes.filter((inc) => inc.id !== id);
  writeLocal(STORAGE_KEYS.OTHER_INCOMES, currentOtherIncomes);
  notifyOtherIncomes();

  if (currentDbInfo.mode === 'firestore') {
    try {
      await deleteDoc(doc(db, 'otherIncomes', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `otherIncomes/${id}`);
    }
  }
}

// -------------------------------------------------------------
// PURGE DUMMY DATA / RESET DATABASE
// -------------------------------------------------------------

export async function clearAllDummyData(): Promise<{ residentsRemoved: number; paymentsRemoved: number; expensesRemoved: number }> {
  const oldResCount = currentResidents.length;
  const oldPayCount = currentPayments.length;
  const oldExpCount = currentExpenses.length;

  currentResidents = currentResidents.filter((r) => !isDummyResident(r));
  currentPayments = currentPayments.filter((p) => !isDummyPayment(p));
  currentExpenses = currentExpenses.filter((e) => !isDummyExpense(e));

  writeLocal(STORAGE_KEYS.RESIDENTS, currentResidents);
  writeLocal(STORAGE_KEYS.PAYMENTS, currentPayments);
  writeLocal(STORAGE_KEYS.EXPENSES, currentExpenses);

  notifyResidents();
  notifyPayments();
  notifyExpenses();

  if (currentDbInfo.mode === 'firestore') {
    try {
      const resSnap = await getDocs(collection(db, 'residents'));
      resSnap.forEach((d) => {
        const r = { id: d.id, ...d.data() } as Resident;
        if (isDummyResident(r)) deleteDoc(doc(db, 'residents', d.id)).catch(() => {});
      });

      const paySnap = await getDocs(collection(db, 'payments'));
      paySnap.forEach((d) => {
        const p = { id: d.id, ...d.data() } as Payment;
        if (isDummyPayment(p)) deleteDoc(doc(db, 'payments', d.id)).catch(() => {});
      });

      const expSnap = await getDocs(collection(db, 'expenses'));
      expSnap.forEach((d) => {
        const e = { id: d.id, ...d.data() } as Expense;
        if (isDummyExpense(e)) deleteDoc(doc(db, 'expenses', d.id)).catch(() => {});
      });
    } catch (err) {
      console.warn('Firestore purge error:', err);
    }
  }

  return {
    residentsRemoved: oldResCount - currentResidents.length,
    paymentsRemoved: oldPayCount - currentPayments.length,
    expensesRemoved: oldExpCount - currentExpenses.length,
  };
}

export async function resetAllDataToEmpty(): Promise<void> {
  currentResidents = [];
  currentPayments = [];
  currentExpenses = [];
  currentOtherIncomes = [];

  writeLocal(STORAGE_KEYS.RESIDENTS, []);
  writeLocal(STORAGE_KEYS.PAYMENTS, []);
  writeLocal(STORAGE_KEYS.EXPENSES, []);
  writeLocal(STORAGE_KEYS.OTHER_INCOMES, []);

  notifyResidents();
  notifyPayments();
  notifyExpenses();
  notifyOtherIncomes();

  if (currentDbInfo.mode === 'firestore') {
    try {
      const [resSnap, paySnap, expSnap, incSnap] = await Promise.all([
        getDocs(collection(db, 'residents')),
        getDocs(collection(db, 'payments')),
        getDocs(collection(db, 'expenses')),
        getDocs(collection(db, 'otherIncomes')),
      ]);

      const deletions: Promise<void>[] = [];
      resSnap.forEach((d) => deletions.push(deleteDoc(doc(db, 'residents', d.id))));
      paySnap.forEach((d) => deletions.push(deleteDoc(doc(db, 'payments', d.id))));
      expSnap.forEach((d) => deletions.push(deleteDoc(doc(db, 'expenses', d.id))));
      incSnap.forEach((d) => deletions.push(deleteDoc(doc(db, 'otherIncomes', d.id))));
      await Promise.all(deletions);
    } catch (err) {
      console.warn('Reset firestore warning:', err);
    }
  }
}

// -------------------------------------------------------------
// BACKUP & RESTORE
// -------------------------------------------------------------

export interface DatabaseBackupPayload {
  version: number;
  exportedAt: string;
  settings: AppSettings;
  residents: Resident[];
  payments: Payment[];
  expenses: Expense[];
  otherIncomes: OtherIncome[];
}

export function exportDatabaseBackup(): string {
  const payload: DatabaseBackupPayload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    settings: currentSettings,
    residents: currentResidents,
    payments: currentPayments,
    expenses: currentExpenses,
    otherIncomes: currentOtherIncomes,
  };
  return JSON.stringify(payload, null, 2);
}

export async function importDatabaseBackup(jsonString: string): Promise<boolean> {
  try {
    const parsed = JSON.parse(jsonString) as DatabaseBackupPayload;
    if (!parsed || !parsed.settings || !Array.isArray(parsed.residents)) {
      throw new Error('Format berkas cadangan database tidak valid.');
    }

    currentSettings = parsed.settings;
    currentResidents = (parsed.residents || []).filter((r) => !isDummyResident(r));
    currentPayments = (parsed.payments || []).filter((p) => !isDummyPayment(p));
    currentExpenses = (parsed.expenses || []).filter((e) => !isDummyExpense(e));
    currentOtherIncomes = parsed.otherIncomes || [];

    writeLocal(STORAGE_KEYS.SETTINGS, currentSettings);
    writeLocal(STORAGE_KEYS.RESIDENTS, currentResidents);
    writeLocal(STORAGE_KEYS.PAYMENTS, currentPayments);
    writeLocal(STORAGE_KEYS.EXPENSES, currentExpenses);
    writeLocal(STORAGE_KEYS.OTHER_INCOMES, currentOtherIncomes);

    notifySettings();
    notifyResidents();
    notifyPayments();
    notifyExpenses();
    notifyOtherIncomes();

    // Sync to firestore if active
    if (currentDbInfo.mode === 'firestore') {
      try {
        await setDoc(doc(db, 'settings', 'general'), currentSettings);
        for (const res of currentResidents) {
          await setDoc(doc(db, 'residents', res.id), res);
        }
        for (const pay of currentPayments) {
          await setDoc(doc(db, 'payments', pay.id), pay);
        }
        for (const exp of currentExpenses) {
          await setDoc(doc(db, 'expenses', exp.id), exp);
        }
        for (const inc of currentOtherIncomes) {
          await setDoc(doc(db, 'otherIncomes', inc.id), inc);
        }
      } catch (err) {
        console.warn('Sync to firestore during restore partially succeeded:', err);
      }
    }

    return true;
  } catch (err) {
    console.error('Error importing database backup:', err);
    throw err;
  }
}

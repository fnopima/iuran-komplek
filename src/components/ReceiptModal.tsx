import React from 'react';
import { X, Printer, Share2, CheckCircle2 } from 'lucide-react';
import type { Payment, AppSettings } from '../types';
import { formatRupiah, formatPeriodMonth, formatDateIndo } from '../lib/formatters';

interface ReceiptModalProps {
  payment: Payment | null;
  settings: AppSettings;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ payment, settings, onClose }) => {
  if (!payment) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const text = `*BUKTI PEMBAYARAN IURAN KOMPLEK*\n` +
      `No. Kuitansi: ${payment.receiptNo}\n` +
      `Komplek: ${settings.complexName} (${settings.rtRw})\n` +
      `--------------------------------\n` +
      `Nama Warga: ${payment.headOfFamily}\n` +
      `Unit/Rumah: ${payment.houseNumber}\n` +
      `Periode: ${formatPeriodMonth(payment.periodMonth)}\n` +
      `Jumlah: ${formatRupiah(payment.amount)}\n` +
      `Metode: ${payment.paymentMethod.toUpperCase()}\n` +
      `Status: LUNAS\n` +
      `Tanggal Bayar: ${formatDateIndo(payment.paidAt)}\n` +
      `Dicatat Oleh: ${payment.recordedBy}\n` +
      `--------------------------------\n` +
      `Terima kasih telah berkontribusi menjaga kenyamanan, keamanan & kebersihan lingkungan kita! 🙏`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl border border-slate-200 overflow-hidden my-8 print:m-0 print:border-none print:shadow-none">
        {/* Top action bar (hidden during print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 print:hidden">
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" /> Kuitansi Sah
            </span>
            <span className="text-xs font-mono text-slate-500">{payment.receiptNo}</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleShareWhatsApp}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition"
              title="Kirim ke WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Kirim WA</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition"
              title="Cetak Kuitansi"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Official Receipt Body */}
        <div id="receipt-content" className="p-8 bg-white relative">
          {/* Header */}
          <div className="text-center pb-5 border-b-2 border-dashed border-slate-200">
            <h2 className="text-lg font-bold tracking-tight text-slate-900 uppercase">
              {settings.complexName}
            </h2>
            <p className="text-xs font-medium text-slate-600">
              PAGUYUBAN WARGA {settings.rtRw} • {settings.subDistrict || 'Kecamatan'}
            </p>
            <div className="inline-block mt-2 px-3 py-0.5 rounded border border-indigo-600 text-indigo-700 font-bold text-xs uppercase tracking-widest">
              Kuitansi Iuran Resmi
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 py-4 text-xs border-b border-slate-100">
            <div>
              <span className="text-slate-400 block">No. Kuitansi:</span>
              <span className="font-mono font-semibold text-slate-800">{payment.receiptNo}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block">Tanggal Pembayaran:</span>
              <span className="font-semibold text-slate-800">{formatDateIndo(payment.paidAt)}</span>
            </div>
          </div>

          {/* Details Table */}
          <div className="py-5 space-y-3 text-xs">
            <div className="flex justify-between items-start py-1">
              <span className="text-slate-500 w-1/3">Telah Terima Dari:</span>
              <span className="font-bold text-slate-900 w-2/3 text-right">{payment.headOfFamily}</span>
            </div>
            <div className="flex justify-between items-start py-1">
              <span className="text-slate-500 w-1/3">Alamat / No. Rumah:</span>
              <span className="font-semibold text-slate-800 w-2/3 text-right">{payment.houseNumber}</span>
            </div>
            <div className="flex justify-between items-start py-1">
              <span className="text-slate-500 w-1/3">Periode Iuran:</span>
              <span className="font-semibold text-indigo-700 w-2/3 text-right bg-indigo-50 px-2 py-0.5 rounded">
                {formatPeriodMonth(payment.periodMonth)}
              </span>
            </div>
            <div className="flex justify-between items-start py-1">
              <span className="text-slate-500 w-1/3">Jenis Iuran:</span>
              <span className="font-medium text-slate-700 w-2/3 text-right">{payment.feeType}</span>
            </div>
            <div className="flex justify-between items-start py-1">
              <span className="text-slate-500 w-1/3">Metode Bayar:</span>
              <span className="font-medium text-slate-700 w-2/3 text-right capitalize">
                {payment.paymentMethod}
              </span>
            </div>
            {payment.notes && (
              <div className="flex justify-between items-start py-1">
                <span className="text-slate-500 w-1/3">Catatan:</span>
                <span className="text-slate-600 italic w-2/3 text-right">{payment.notes}</span>
              </div>
            )}
          </div>

          {/* Total Amount Box */}
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              Total Pembayaran
            </span>
            <span className="text-xl font-bold text-slate-900">
              {formatRupiah(payment.amount)}
            </span>
          </div>

          {/* Signature & Stamp Footer */}
          <div className="pt-6 grid grid-cols-2 gap-4 text-center text-xs text-slate-500">
            <div>
              <p className="text-[11px] text-slate-400 mb-10">Warga Pembayar</p>
              <p className="font-semibold text-slate-800 border-t border-slate-200 pt-1 inline-block min-w-[120px]">
                {payment.headOfFamily}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400 mb-10">Bendahara / Pengurus RT</p>
              <p className="font-semibold text-slate-800 border-t border-slate-200 pt-1 inline-block min-w-[120px]">
                {payment.recordedBy || settings.treasurerName}
              </p>
            </div>
          </div>

          <div className="mt-6 pt-3 text-center border-t border-slate-100 text-[10px] text-slate-400">
            Kuitansi ini dibuat secara digital dan merupakan bukti pembayaran yang sah bagi warga {settings.complexName}.
          </div>
        </div>
      </div>
    </div>
  );
};

'use client';

import React, { useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Printer, X } from 'lucide-react';
import type { Order } from '@/lib/catalog';

interface InvoiceModalProps {
  order: Order | null;
  onClose: () => void;
}

export default function InvoiceModal({ order, onClose }: InvoiceModalProps) {
  const componentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: `Invoice-LAUNDRY-${order?.id || ''}`,
    onAfterPrint: onClose,
  });

  if (!order) return null;

  const finalPrice = order.finalPrice ?? (order.totalPrice - (order.totalPrice * (order.discount || 0)) / 100);
  const compensation = order.compensation || 0;
  const grandTotal = finalPrice - compensation;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
          <h2 className="text-xl font-bold dark:text-white">Cetak Invoice</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
          >
            <X className="w-5 h-5 dark:text-white" />
          </button>
        </div>

        {/* Preview Invoice */}
        <div className="p-6">
          <div ref={componentRef} className="bg-white p-8 border rounded-lg">
            {/* Header Invoice */}
            <div className="text-center mb-6 pb-4 border-b-2 border-gray-800">
              <h1 className="text-2xl font-bold text-gray-900">LAUNDRY.DASH</h1>
              <p className="text-sm text-gray-600 mt-1">Jasa Laundry Profesional</p>
              <p className="text-xs text-gray-500 mt-2">
                Invoice #{order.id.toString().padStart(6, '0')}
              </p>
              <p className="text-xs text-gray-500">
                Tanggal: {new Date(order.createdAt).toLocaleDateString('id-ID', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>

            {/* Info Pelanggan */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-2">Detail Pelanggan</h3>
              <table className="w-full text-sm">
                <tbody>
                  <tr>
                    <td className="py-1 text-gray-600 w-32">Nama</td>
                    <td className="py-1 font-medium">{order.customerName}</td>
                  </tr>
                  {order.phoneNumber && (
                    <tr>
                      <td className="py-1 text-gray-600">WhatsApp</td>
                      <td className="py-1">
                        <a 
                          href={`https://wa.me/${order.phoneNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {order.phoneNumber}
                        </a>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Detail Pesanan */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-2">Detail Pesanan</h3>
              <table className="w-full text-sm">
                <tbody>
                  <tr>
                    <td className="py-1 text-gray-600 w-32">Layanan</td>
                    <td className="py-1 font-medium">{order.serviceType}</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-gray-600">Berat</td>
                    <td className="py-1">{order.weight.toFixed(2)} kg</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-gray-600">Harga/kg</td>
                    <td className="py-1">Rp {order.pricePerKg.toLocaleString('id-ID')}</td>
                  </tr>
                  <tr>
                    <td className="py-1 text-gray-600">Subtotal</td>
                    <td className="py-1">Rp {order.totalPrice.toLocaleString('id-ID')}</td>
                  </tr>
                  {order.discount !== undefined && order.discount > 0 && (
                    <tr>
                      <td className="py-1 text-gray-600">Diskon ({order.discount}%)</td>
                      <td className="py-1 text-red-600">- Rp {(order.totalPrice * order.discount / 100).toLocaleString('id-ID')}</td>
                    </tr>
                  )}
                  {compensation > 0 && (
                    <tr>
                      <td className="py-1 text-gray-600">Kompensasi</td>
                      <td className="py-1 text-red-600">- Rp {compensation.toLocaleString('id-ID')}</td>
                    </tr>
                  )}
                  <tr className="border-t-2 border-gray-800">
                    <td className="py-2 font-bold text-gray-900">Total Akhir</td>
                    <td className="py-2 font-bold text-gray-900 text-lg">
                      Rp {grandTotal.toLocaleString('id-ID')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Status & Catatan */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 mb-2">Status & Catatan</h3>
              <table className="w-full text-sm">
                <tbody>
                  <tr>
                    <td className="py-1 text-gray-600 w-32">Status</td>
                    <td className="py-1">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        order.status === 'Dibatalkan' ? 'bg-red-100 text-red-800' :
                        order.status === 'Selesai' ? 'bg-green-100 text-green-800' :
                        order.status === 'Diambil' ? 'bg-gray-100 text-gray-800' :
                        order.status === 'Diproses' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                  </tr>
                  {order.cancellationReason && (
                    <tr>
                      <td className="py-1 text-gray-600">Alasan Batal</td>
                      <td className="py-1 text-red-600">{order.cancellationReason}</td>
                    </tr>
                  )}
                  {order.notes && (
                    <tr>
                      <td className="py-1 text-gray-600 align-top">Catatan</td>
                      <td className="py-1">{order.notes}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="mt-8 pt-4 border-t text-center text-xs text-gray-500">
              <p>Terima kasih atas kepercayaan Anda!</p>
              <p className="mt-1">Untuk informasi lebih lanjut, hubungi kami via WhatsApp.</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 p-6 border-t dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            Tutup
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Cetak Invoice
          </button>
        </div>
      </div>
    </div>
  );
}

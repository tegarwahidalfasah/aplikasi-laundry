import React from 'react';

// Kita pakai class component atau functional component dengan forwardRef
export const StrukLaundry = React.forwardRef((props, ref) => {
  const { transaksi } = props; // Data transaksi dari parent

  return (
    <div ref={ref} className="p-4 text-xs font-mono text-black bg-white" style={{ width: '58mm' }}>
      {/* Header Struk */}
      <div className="text-center mb-4 border-b border-black pb-2">
        <h2 className="font-bold text-lg">LAUNDRY TEGAR</h2>
        <p>Jl. Contoh No. 123</p>
        <p>WA: 0812-3456-7890</p>
      </div>

      {/* Info Transaksi */}
      <div className="mb-2">
        <div className="flex justify-between">
          <span>No:</span>
          <span>{transaksi.invoice}</span>
        </div>
        <div className="flex justify-between">
          <span>Tgl:</span>
          <span>{new Date(transaksi.tanggal).toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between">
          <span>Plg:</span>
          <span>{transaksi.namaPelanggan}</span>
        </div>
      </div>

      <div className="border-b border-dashed border-black my-2"></div>

      {/* List Item */}
      <div className="mb-4">
        {transaksi.items.map((item, index) => (
          <div key={index} className="flex justify-between mb-1">
            <span>{item.nama_paket} x{item.qty}</span>
            <span>Rp {item.total.toLocaleString()}</span>
          </div>
        ))}
      </div>

      <div className="border-b border-black my-2"></div>

      {/* Total */}
      <div className="font-bold">
        <div className="flex justify-between">
          <span>TOTAL:</span>
          <span>Rp {transaksi.totalBayar.toLocaleString()}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center mt-4 text-[10px]">
        <p>Terima Kasih!</p>
        <p>Barang yang tidak diambil &gt; 1 bulan bukan tanggung jawab kami.</p>
      </div>
    </div>
  );
});

StrukLaundry.displayName = 'StrukLaundry';
"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    customerName: "",
    weight: "",
    phoneNumber: "",
  });

  const fetchOrders = async () => {
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      setOrders(data);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalPrice = parseFloat(formData.weight) * 7000;
    await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...formData, totalPrice, weight: parseFloat(formData.weight) }),
    });
    setFormData({ customerName: "", weight: "", phoneNumber: "" });
    fetchOrders();
  };

  const handleUpdateStatus = async (id: number, newStatus: string) => {
    await fetch("/api/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: newStatus }),
    });
    fetchOrders();
  };

  const handleDelete = async (id: number) => {
    if (confirm("Hapus data secara permanen?")) {
      await fetch(`/api/orders?id=${id}`, { method: "DELETE" });
      fetchOrders();
    }
  };

  const sendWhatsApp = (order: any) => {
    let phone = order.phoneNumber || "";
    if (phone.startsWith("0")) phone = "62" + phone.slice(1);
    const msg = `Halo *${order.customerName}*, laundry Anda sudah *SELESAI*. Total: Rp ${order.totalPrice.toLocaleString("id-ID")}. 🙏`;
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  const totalRevenue = orders.reduce((acc: number, curr: any) => acc + curr.totalPrice, 0);
  const pendingOrders = orders.filter((o: any) => o.status !== "Selesai").length;

  return (
    <main className="min-h-screen bg-[#0f172a] text-slate-200 pb-20 font-sans">
      {/* Header Neon */}
      <div className="border-b border-blue-500/30 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-white flex items-center gap-2">
              <span className="bg-blue-600 px-2 py-1 rounded-lg text-sm">LA</span> 
              LAUNDRY<span className="text-blue-500">.DASH</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Server Latency</p>
              <p className="text-xs font-mono text-blue-400">Stable 18ms</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center font-bold text-blue-400">
              T
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-10">
        {/* Stats Section - High Contrast */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Total Pendapatan</p>
            <p className="text-4xl font-black text-white">Rp {totalRevenue.toLocaleString("id-ID")}</p>
            <div className="mt-4 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 w-3/4"></div>
            </div>
          </div>
          <div className="bg-slate-900 border border-blue-500/50 p-6 rounded-2xl shadow-blue-500/5 shadow-2xl">
            <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">Sedang Diproses</p>
            <p className="text-4xl font-black text-white">{pendingOrders} <span className="text-lg text-slate-500 font-medium tracking-normal">Antrean</span></p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Selesai Diambil</p>
            <p className="text-4xl font-black text-emerald-400">{orders.length - pendingOrders}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Input Section - Dark Mode Form */}
          <section className="lg:col-span-4">
            <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl sticky top-24">
              <h2 className="text-xl font-bold mb-8 text-white flex items-center gap-3">
                <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
                Input Pesanan
              </h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Nama Customer</label>
                  <input type="text" className="w-full p-4 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-white font-medium" value={formData.customerName} onChange={(e) => setFormData({ ...formData, customerName: e.target.value })} required placeholder="E.g. Tegar Pratama" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">No. WhatsApp</label>
                  <input type="text" className="w-full p-4 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-white font-medium" value={formData.phoneNumber} onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })} required placeholder="08xxxxxxxxxx" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Berat (Kilogram)</label>
                  <input type="number" step="0.1" className="w-full p-4 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-white font-medium" value={formData.weight} onChange={(e) => setFormData({ ...formData, weight: e.target.value })} required placeholder="0.0" />
                </div>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-5 rounded-2xl shadow-lg shadow-blue-500/20 transition-all active:scale-95 text-sm uppercase tracking-widest mt-4">
                  Simpan Transaksi
                </button>
              </form>
            </div>
          </section>

          {/* Table Section - High Contrast List */}
          <section className="lg:col-span-8">
            <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
              <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                <h2 className="text-xl font-bold text-white tracking-tight">Daftar Manifest Pesanan</h2>
                <div className="bg-blue-500/10 text-blue-400 text-[10px] font-black px-3 py-1 rounded-full border border-blue-500/20 uppercase tracking-widest">
                  Live Data
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-950/50">
                    <tr>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Detail Pelanggan</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Biaya</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Status</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {orders.map((order: any) => (
                      <tr key={order.id} className="hover:bg-blue-500/[0.03] transition-colors group">
                        <td className="px-8 py-6">
                          <p className="font-bold text-white text-lg group-hover:text-blue-400 transition-colors">{order.customerName}</p>
                          <p className="text-xs text-slate-500 font-bold uppercase mt-1">{order.weight}kg • {new Date(order.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <p className="font-black text-blue-400">Rp {order.totalPrice.toLocaleString("id-ID")}</p>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter border ${
                            order.status === "Selesai" 
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" 
                            : "bg-orange-500/10 text-orange-400 border-orange-500/30"
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex justify-end gap-3">
                            {order.status === "Selesai" && (
                              <button onClick={() => sendWhatsApp(order)} className="p-3 bg-blue-500/10 text-blue-400 rounded-xl hover:bg-blue-500 hover:text-white transition-all border border-blue-500/30" title="Kirim Notifikasi">
                                💬
                              </button>
                            )}
                            {order.status !== "Selesai" && (
                              <button onClick={() => handleUpdateStatus(order.id, "Selesai")} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-[10px] font-black transition-all shadow-lg shadow-blue-600/20">
                                SELESAI
                              </button>
                            )}
                            <button onClick={() => handleDelete(order.id)} className="p-3 text-slate-600 hover:text-red-500 transition-colors">
                              🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <p className="mt-8 text-center text-[10px] font-black text-slate-600 tracking-[0.4em] uppercase">
              Operational Database Integrated • System v2.5
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
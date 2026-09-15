"use client";

import { useCallback, useEffect, useState } from "react";
import {
  NEXT_STATUS_LABEL,
  SERVICE_TYPES,
  nextStatus,
  type Order,
  type OrderStatus,
} from "@/lib/catalog";

const ADMIN_KEY_STORAGE = "laundry-admin-key";

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

/**
 * Fetch pembungkus: menyertakan x-admin-key bila pernah disimpan,
 * dan sekali prompt ulang saat 401 (untuk deploy yang mengunci API).
 */
async function apiFetch(input: RequestInfo, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  const saved = window.localStorage.getItem(ADMIN_KEY_STORAGE);
  if (saved) headers.set("x-admin-key", saved);

  let res = await fetch(input, { ...init, headers });
  if (res.status === 401) {
    const key = window.prompt("API dikunci ADMIN_KEY. Masukkan kunci akses:");
    if (key) {
      window.localStorage.setItem(ADMIN_KEY_STORAGE, key);
      headers.set("x-admin-key", key);
      res = await fetch(input, { ...init, headers });
    }
  }
  return res;
}

async function readError(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.error === "string") return data.error;
  } catch {
    /* body bukan JSON */
  }
  return `${fallback} (HTTP ${res.status})`;
}

interface StorageInfo {
  driver: "netlify-blobs" | "in-memory";
  persistent: boolean;
}

const STATUS_STYLE: Record<OrderStatus, string> = {
  Antri: "bg-orange-500/10 text-orange-400 border-orange-500/30",
  Diproses: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  Selesai: "bg-violet-500/10 text-violet-400 border-violet-500/30",
  Diambil: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
};

export default function Home() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [notice, setNotice] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [formData, setFormData] = useState<{
    customerName: string;
    phoneNumber: string;
    serviceType: string;
    weight: string;
  }>({
    customerName: "",
    phoneNumber: "",
    serviceType: SERVICE_TYPES[0].name,
    weight: "",
  });

  const flash = (kind: "ok" | "err", text: string) => setNotice({ kind, text });

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders", { cache: "no-store" });
      if (!res.ok) throw new Error(await readError(res, "Gagal memuat data"));
      const data = (await res.json()) as Order[];
      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      setOrders([]);
      flash("err", error instanceof Error ? error.message : "Gagal memuat data pesanan.");
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    fetch("/api/storage")
      .then((r) => (r.ok ? (r.json() as Promise<StorageInfo>) : null))
      .then(setStorage)
      .catch(() => setStorage(null));
  }, [fetchOrders]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  const selectedPrice = SERVICE_TYPES.find((s) => s.name === formData.serviceType)?.pricePerKg ?? 0;
  const estimatedTotal = Math.max(0, Math.round(parseFloat(formData.weight || "0") * selectedPrice));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await apiFetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        flash("err", await readError(res, "Gagal menyimpan pesanan"));
        return;
      }
      const order = (await res.json()) as Order;
      flash("ok", `Pesanan #${order.id} tersimpan — total ${rupiah.format(order.totalPrice)}.`);
      setFormData({ customerName: "", phoneNumber: "", serviceType: formData.serviceType, weight: "" });
      await fetchOrders();
    } finally {
      setBusy(false);
    }
  };

  const handleAdvanceStatus = async (order: Order) => {
    const target = nextStatus(order.status);
    if (!target) return;
    setBusy(true);
    try {
      const res = await apiFetch("/api/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: order.id, status: target }),
      });
      if (!res.ok) {
        flash("err", await readError(res, "Gagal mengubah status"));
        return;
      }
      await fetchOrders();
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(`Hapus pesanan #${id} secara permanen?`)) return;
    setBusy(true);
    try {
      const res = await apiFetch(`/api/orders?id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        flash("err", await readError(res, "Gagal menghapus"));
        return;
      }
      flash("ok", `Pesanan #${id} dihapus.`);
      await fetchOrders();
    } finally {
      setBusy(false);
    }
  };

  const sendWhatsApp = (order: Order) => {
    if (!order.phoneNumber) return;
    const done = order.status === "Diambil";
    const msg = done
      ? `Halo ${order.customerName}, pesanan laundry #${order.id} sudah selesai diambil. Terima kasih! 🙏`
      : `Halo ${order.customerName}, laundry Anda (#${order.id}, ${order.serviceType} ${order.weight}kg) sudah SELESAI. Total: ${rupiah.format(order.totalPrice)}. Silakan diambil 🙏`;
    // wa.me mensyaratkan URL ter-encode — tanpa ini nama dengan & # + akan merusak pesan.
    window.open(`https://wa.me/${order.phoneNumber}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
  };

  const list = orders ?? [];
  const totalRevenue = list.reduce((acc, o) => acc + o.totalPrice, 0);
  const processingOrders = list.filter((o) => o.status === "Antri" || o.status === "Diproses").length;
  const doneOrders = list.filter((o) => o.status === "Selesai" || o.status === "Diambil").length;

  return (
    <main className="min-h-screen bg-[#0f172a] text-slate-200 pb-20 font-sans">
      <div className="border-b border-blue-500/30 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-white flex items-center gap-2">
              <span className="bg-blue-600 px-2 py-1 rounded-lg text-sm">LA</span>
              LAUNDRY<span className="text-blue-500">.DASH</span>
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Penyimpanan</p>
              <p className="text-xs font-mono text-blue-400">
                {storage === null
                  ? "…"
                  : storage.driver === "netlify-blobs"
                    ? "Netlify Blobs ✓"
                    : "In-memory (dev)"}
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-blue-500/50 flex items-center justify-center font-bold text-blue-400">
              T
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-10">
        {notice && (
          <div
            role="status"
            className={`mb-6 px-5 py-3.5 rounded-xl text-sm font-bold border ${
              notice.kind === "ok"
                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                : "bg-red-500/10 text-red-300 border-red-500/30"
            }`}
          >
            {notice.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-2xl">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Total Pendapatan</p>
            <p className="text-4xl font-black text-white">{rupiah.format(totalRevenue)}</p>
          </div>
          <div className="bg-slate-900 border border-blue-500/50 p-6 rounded-2xl shadow-blue-500/5 shadow-2xl">
            <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">Sedang Diproses</p>
            <p className="text-4xl font-black text-white">
              {processingOrders} <span className="text-lg text-slate-500 font-medium tracking-normal">Antrean</span>
            </p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Selesai / Diambil</p>
            <p className="text-4xl font-black text-emerald-400">{doneOrders}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* ---------- Form input ---------- */}
          <section className="lg:col-span-4">
            <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 shadow-2xl sticky top-24">
              <h2 className="text-xl font-bold mb-8 text-white flex items-center gap-3">
                <span className="w-1.5 h-6 bg-blue-500 rounded-full"></span>
                Input Pesanan
              </h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="customerName" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                    Nama Customer
                  </label>
                  <input
                    id="customerName"
                    type="text"
                    maxLength={80}
                    className="w-full p-4 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-white font-medium"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    required
                    placeholder="E.g. Tegar Pratama"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="phoneNumber" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                    No. WhatsApp <span className="text-slate-600 normal-case">(opsional)</span>
                  </label>
                  <input
                    id="phoneNumber"
                    type="tel"
                    className="w-full p-4 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-white font-medium"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    placeholder="08xxxxxxxxxx"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="serviceType" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                    Layanan
                  </label>
                  <select
                    id="serviceType"
                    className="w-full p-4 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-white font-medium"
                    value={formData.serviceType}
                    onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
                  >
                    {SERVICE_TYPES.map((s) => (
                      <option key={s.name} value={s.name} className="bg-slate-900">
                        {s.name} — {rupiah.format(s.pricePerKg)}/kg
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="weight" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                    Berat (Kilogram)
                  </label>
                  <input
                    id="weight"
                    type="number"
                    min={0.1}
                    max={100}
                    step={0.1}
                    className="w-full p-4 bg-slate-800/50 border border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-white font-medium"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                    required
                    placeholder="0.0"
                  />
                </div>
                <p className="text-right text-xs text-slate-400 font-medium px-1">
                  Estimasi: <span className="text-blue-400 font-black">{rupiah.format(estimatedTotal)}</span>
                </p>
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black py-5 rounded-2xl shadow-lg shadow-blue-500/20 transition-all active:scale-95 text-sm uppercase tracking-widest mt-4"
                >
                  Simpan Transaksi
                </button>
              </form>
            </div>
          </section>

          {/* ---------- Tabel pesanan ---------- */}
          <section className="lg:col-span-8">
            <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden">
              <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
                <h2 className="text-xl font-bold text-white tracking-tight">Daftar Manifest Pesanan</h2>
                <div className="bg-blue-500/10 text-blue-400 text-[10px] font-black px-3 py-1 rounded-full border border-blue-500/20 uppercase tracking-widest">
                  {orders === null ? "Memuat…" : `${list.length} Pesanan`}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-950/50">
                    <tr>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Detail Pelanggan</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Layanan</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Biaya</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Status</th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {orders === null &&
                      [0, 1, 2].map((i) => (
                        <tr key={i}>
                          <td colSpan={5} className="px-8 py-6">
                            <div className="h-5 bg-slate-800 rounded animate-pulse" />
                          </td>
                        </tr>
                      ))}
                    {orders !== null && list.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-8 py-12 text-center text-slate-500 font-medium">
                          Belum ada pesanan. Tambahkan lewat form di samping. ✨
                        </td>
                      </tr>
                    )}
                    {orders !== null &&
                      list.map((order) => (
                        <tr key={order.id} className="hover:bg-blue-500/[0.03] transition-colors group">
                          <td className="px-8 py-6">
                            <p className="font-bold text-white text-lg group-hover:text-blue-400 transition-colors">
                              {order.customerName}
                            </p>
                            <p className="text-xs text-slate-500 font-bold mt-1">
                              #{order.id} • {order.phoneNumber ? `+${order.phoneNumber}` : "tanpa WA"} •{" "}
                              {new Date(order.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                          </td>
                          <td className="px-8 py-6">
                            <p className="text-sm font-bold text-slate-300">{order.serviceType}</p>
                            <p className="text-xs text-slate-500 font-medium mt-1">
                              {order.weight} kg × {rupiah.format(order.pricePerKg)}
                            </p>
                          </td>
                          <td className="px-8 py-6 text-center">
                            <p className="font-black text-blue-400">{rupiah.format(order.totalPrice)}</p>
                          </td>
                          <td className="px-8 py-6 text-center">
                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter border ${STATUS_STYLE[order.status]}`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex justify-end gap-3">
                              {order.status === "Selesai" && order.phoneNumber && (
                                <button
                                  onClick={() => sendWhatsApp(order)}
                                  disabled={busy}
                                  className="p-3 bg-blue-500/10 text-blue-400 rounded-xl hover:bg-blue-500 hover:text-white transition-all border border-blue-500/30"
                                  title="Kabari via WhatsApp"
                                  aria-label={`Kabari ${order.customerName} via WhatsApp`}
                                >
                                  💬
                                </button>
                              )}
                              {nextStatus(order.status) && (
                                <button
                                  onClick={() => handleAdvanceStatus(order)}
                                  disabled={busy}
                                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-[10px] font-black transition-all shadow-lg shadow-blue-600/20"
                                >
                                  {NEXT_STATUS_LABEL[order.status].toUpperCase()}
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(order.id)}
                                disabled={busy}
                                className="p-3 text-slate-600 hover:text-red-500 transition-colors"
                                title="Hapus pesanan"
                                aria-label={`Hapus pesanan ${order.id}`}
                              >
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
            {storage && !storage.persistent && (
              <p className="mt-6 text-center text-[11px] font-bold text-amber-400/80 tracking-wide">
                ⚠ Mode dev: data disimpan di memori dan hilang saat server dihentikan. Di Netlify, data otomatis
                persisten via Netlify Blobs.
              </p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

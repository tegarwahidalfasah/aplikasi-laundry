// Katalog layanan & aturan status pesanan.
// Satu-satunya sumber kebenaran harga: server yang menghitung total,
// klien hanya menampilkan estimasi.

export const SERVICE_TYPES = [
  { name: "Cuci Lipat", pricePerKg: 7000 },
  { name: "Cuci Setrika", pricePerKg: 9000 },
  { name: "Setrika Saja", pricePerKg: 5000 },
  { name: "Dry Clean", pricePerKg: 15000 },
] as const;

export type ServiceTypeName = (typeof SERVICE_TYPES)[number]["name"];

export const ORDER_STATUSES = ["Antri", "Diproses", "Selesai", "Diambil"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface Order {
  id: number;
  customerName: string;
  /** Nomor WhatsApp dinormalisasi ke format 62xxxxxxxxxxx (hanya digit). */
  phoneNumber: string | null;
  serviceType: string;
  weight: number;
  /** Tarif per kg yang dipakai saat order dibuat (rupiah, integer). */
  pricePerKg: number;
  /** weight * pricePerKg, dibulatkan ke rupiah (integer, bukan float). */
  totalPrice: number;
  status: OrderStatus;
  createdAt: string;
}

export function priceFor(serviceType: string): number | null {
  const found = SERVICE_TYPES.find((s) => s.name === serviceType);
  return found ? found.pricePerKg : null;
}

export function nextStatus(status: OrderStatus): OrderStatus | null {
  const idx = ORDER_STATUSES.indexOf(status);
  return idx >= 0 && idx < ORDER_STATUSES.length - 1 ? ORDER_STATUSES[idx + 1] : null;
}

export const NEXT_STATUS_LABEL: Record<OrderStatus, string> = {
  Antri: "Mulai Cuci",
  Diproses: "Tandai Selesai",
  Selesai: "Sudah Diambil",
  Diambil: "",
};

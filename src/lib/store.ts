// Lapisan penyimpanan pesanan.
//
// - Di Netlify (build & runtime) memakai **Netlify Blobs** — penyimpanan
//   key-value bawaan Netlify, persisten lintas deploy, tanpa database eksternal.
// - Di luar Netlify (mis. `npm run dev` lokal) memakai penyimpanan **in-memory**
//   sehingga proyek bisa dijalankan tanpa konfigurasi apa pun
//   (data hilang saat server dimatikan — itu memang tujuannya).
import type { Order, OrderStatus } from "./catalog";
import type { NewOrderInput } from "./validation";

const BLOB_STORE_NAME = "laundry-orders";
const ORDER_PREFIX = "order/";
const COUNTER_KEY = "order/counter";

interface StoreLike {
  get(key: string): Promise<string | null>;
  getMany(keys: string[]): Promise<(string | null)[]>;
  set(key: string, value: string): Promise<unknown>;
  delete(key: string): Promise<unknown>;
  list(options?: { prefix?: string }): Promise<{ blobs: Array<{ key: string }> }>;
}

// ---------- fallback in-memory (untuk dev lokal) ----------
const memory = new Map<string, string>();

const memoryStore: StoreLike = {
  async get(key) {
    return memory.get(key) ?? null;
  },
  async getMany(keys) {
    return keys.map((k) => memory.get(k) ?? null);
  },
  async set(key, value) {
    memory.set(key, value);
  },
  async delete(key) {
    memory.delete(key);
  },
  async list(options) {
    const prefix = options?.prefix ?? "";
    return { blobs: [...memory.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })) };
  },
};

// ---------- Netlify Blobs ----------
let blobsPromise: Promise<StoreLike | null> | null = null;

function resolveBlobsStore(): Promise<StoreLike | null> {
  if (!blobsPromise) {
    blobsPromise = (async () => {
      // NETLIFY=true tersedia di environment build & runtime Netlify.
      // Set USE_NETLIFY_BLOBS=true untuk memaksa mode blobs di lingkungan lain.
      if (process.env.NETLIFY !== "true" && process.env.USE_NETLIFY_BLOBS !== "true") {
        return null;
      }
      try {
        const { getStore } = await import("@netlify/blobs");
        // siteID & token diisi otomatis oleh runtime Netlify.
        return getStore({ name: BLOB_STORE_NAME }) as unknown as StoreLike;
      } catch (err) {
        console.error("[store] Netlify Blobs tidak tersedia, jatuh ke in-memory:", err);
        return null;
      }
    })();
  }
  return blobsPromise;
}

async function store(): Promise<{ s: StoreLike; persistent: boolean }> {
  const blobs = await resolveBlobsStore();
  if (blobs) return { s: blobs, persistent: true };
  return { s: memoryStore, persistent: false };
}

function keyFor(id: number): string {
  return `${ORDER_PREFIX}${id}`;
}

// ---------- operasi CRUD ----------

export async function listOrders(options?: { 
  search?: string; 
  status?: string; 
  page?: number; 
  limit?: number;
}): Promise<{ orders: Order[]; total: number }> {
  const { s } = await store();
  const { blobs } = await s.list({ prefix: ORDER_PREFIX });
  const keys = blobs.map((b) => b.key).filter((k) => k !== COUNTER_KEY);
  const values = await s.getMany(keys);
  const allOrders: Order[] = [];
  
  for (const value of values) {
    if (!value) continue;
    try {
      allOrders.push(JSON.parse(value) as Order);
    } catch {
      console.error("[store] Entri rusak, dilewati");
    }
  }
  
  // Filter berdasarkan pencarian
  let filtered = allOrders;
  if (options?.search) {
    const searchLower = options.search.toLowerCase();
    filtered = filtered.filter(order => 
      order.customerName.toLowerCase().includes(searchLower) ||
      order.phoneNumber?.includes(options.search || "") ||
      order.serviceType.toLowerCase().includes(searchLower)
    );
  }
  
  // Filter berdasarkan status
  if (options?.status) {
    filtered = filtered.filter(order => order.status === options.status);
  }
  
  // Sortir berdasarkan tanggal dan ID
  filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id);
  
  const total = filtered.length;
  
  // Pagination
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 50;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedOrders = filtered.slice(startIndex, endIndex);
  
  return { orders: paginatedOrders, total };
}

export async function createOrder(input: NewOrderInput): Promise<Order> {
  const { s } = await store();
  const rawCounter = await s.get(COUNTER_KEY);
  const id = (Number.parseInt(rawCounter ?? "0", 10) || 0) + 1;
  await s.set(COUNTER_KEY, String(id));
  const order: Order = { id, status: "Antri", createdAt: new Date().toISOString(), ...input };
  await s.set(keyFor(id), JSON.stringify(order));
  return order;
}

export async function updateOrderWithCompensation(
  id: number, 
  status: OrderStatus | "Dibatalkan", 
  cancellationReason?: string,
  compensation?: number
): Promise<Order | null> {
  const { s } = await store();
  const key = keyFor(id);
  const raw = await s.get(key);
  if (!raw) return null;
  const order: Order = JSON.parse(raw);
  order.status = status;
  
  if (status === 'Dibatalkan') {
    order.cancellationReason = cancellationReason || '';
    order.compensation = compensation || 0;
  }
  
  // Recalculate final price with discount and compensation
  const discount = order.discount || 0;
  const afterDiscount = order.totalPrice - (order.totalPrice * discount / 100);
  order.finalPrice = afterDiscount;
  
  await s.set(key, JSON.stringify(order));
  return order;
}

export async function updateOrderStatus(id: number, status: OrderStatus): Promise<Order | null> {
  const { s } = await store();
  const key = keyFor(id);
  const raw = await s.get(key);
  if (!raw) return null;
  const order: Order = JSON.parse(raw);
  order.status = status;
  
  // Recalculate final price with discount
  const discount = order.discount || 0;
  const afterDiscount = order.totalPrice - (order.totalPrice * discount / 100);
  order.finalPrice = afterDiscount;
  
  await s.set(key, JSON.stringify(order));
  return order;
}

export async function deleteOrder(id: number): Promise<boolean> {
  const { s } = await store();
  const key = keyFor(id);
  if (!(await s.get(key))) return false;
  await s.delete(key);
  return true;
}

/** Info mode penyimpanan, untuk badge status di UI. */
export async function storageInfo(): Promise<{ driver: "netlify-blobs" | "in-memory"; persistent: boolean }> {
  const { persistent } = await store();
  return { driver: persistent ? "netlify-blobs" : "in-memory", persistent };
}

/** Export semua pesanan ke format CSV */
export async function exportOrdersToCSV(): Promise<string> {
  const { orders } = await listOrders({ limit: 10000, page: 1 });
  
  const headers = ['ID', 'Tanggal', 'Nama Pelanggan', 'No WhatsApp', 'Layanan', 'Berat (kg)', 'Harga/kg', 'Diskon (%)', 'Total', 'Status', 'Catatan'];
  const rows = orders.map(order => [
    order.id,
    order.createdAt,
    `"${order.customerName.replace(/"/g, '""')}"`,
    order.phoneNumber || '',
    `"${order.serviceType.replace(/"/g, '""')}"`,
    order.weight,
    order.pricePerKg,
    order.discount || 0,
    order.totalPrice,
    order.status,
    order.notes ? `"${order.notes.replace(/"/g, '""')}"` : ''
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
  
  return csvContent;
}

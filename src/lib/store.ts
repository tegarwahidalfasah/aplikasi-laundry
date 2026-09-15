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

export async function listOrders(): Promise<Order[]> {
  const { s } = await store();
  const { blobs } = await s.list({ prefix: ORDER_PREFIX });
  const keys = blobs.map((b) => b.key).filter((k) => k !== COUNTER_KEY);
  const values = await s.getMany(keys);
  const orders: Order[] = [];
  for (const value of values) {
    if (!value) continue;
    try {
      orders.push(JSON.parse(value) as Order);
    } catch {
      console.error("[store] Entri rusak, dilewati");
    }
  }
  return orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id);
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

export async function updateOrderStatus(id: number, status: OrderStatus): Promise<Order | null> {
  const { s } = await store();
  const key = keyFor(id);
  const raw = await s.get(key);
  if (!raw) return null;
  const order: Order = JSON.parse(raw);
  order.status = status;
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

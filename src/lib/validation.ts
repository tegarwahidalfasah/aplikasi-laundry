// Validasi input API — semua dihitung ulang di server (jangan percaya klien).
import { ORDER_STATUSES, priceFor, type OrderStatus } from "./catalog";

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export interface NewOrderInput {
  customerName: string;
  phoneNumber: string | null;
  serviceType: string;
  weight: number;
  pricePerKg: number;
  totalPrice: number;
}

const MAX_NAME = 80;
const MIN_WEIGHT = 0.1;
const MAX_WEIGHT = 100;

/**
 * Normalisasi nomor Indonesia ke format wa.me: hanya digit, diawali "62".
 * "0812-3456 789", "+62 812...", "62812..." → "62812..."
 */
export function normalizePhoneNumber(raw: unknown): { ok: true; value: string | null } | { ok: false; error: string } {
  if (raw === null || raw === undefined || String(raw).trim() === "") {
    return { ok: true, value: null };
  }
  let digits = String(raw).replace(/\D/g, "");
  if (digits.startsWith("0")) digits = "62" + digits.slice(1);
  else if (digits.startsWith("8")) digits = "62" + digits;
  else if (digits.startsWith("620")) digits = "62" + digits.slice(3);
  if (!/^62\d{7,13}$/.test(digits)) {
    return { ok: false, error: "Nomor WhatsApp tidak valid. Gunakan format 08xx atau +628xx." };
  }
  return { ok: true, value: digits };
}

export function validateCreateOrder(body: unknown): Result<NewOrderInput> {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, error: "Body harus berupa objek JSON." };
  }
  const b = body as Record<string, unknown>;

  const customerName = typeof b.customerName === "string" ? b.customerName.trim() : "";
  if (customerName.length < 1 || customerName.length > MAX_NAME) {
    return { ok: false, error: `Nama pelanggan wajib diisi (maks ${MAX_NAME} karakter).` };
  }

  const phone = normalizePhoneNumber(b.phoneNumber);
  if (!phone.ok) return { ok: false, error: phone.error };

  const serviceType = typeof b.serviceType === "string" && b.serviceType ? b.serviceType : "Cuci Lipat";
  const pricePerKg = priceFor(serviceType);
  if (pricePerKg === null) {
    return { ok: false, error: `Layanan "${serviceType}" tidak dikenal.` };
  }

  const weightRaw = Number(b.weight);
  if (!Number.isFinite(weightRaw)) {
    return { ok: false, error: "Berat harus berupa angka." };
  }
  const weight = Math.round(weightRaw * 10) / 10;
  if (weight < MIN_WEIGHT || weight > MAX_WEIGHT) {
    return { ok: false, error: `Berat harus antara ${MIN_WEIGHT}–${MAX_WEIGHT} kg.` };
  }

  // Total dihitung server — totalPrice kiriman klien sengaja diabaikan.
  return {
    ok: true,
    value: { customerName, phoneNumber: phone.value, serviceType, weight, pricePerKg, totalPrice: Math.round(weight * pricePerKg) },
  };
}

export function validateOrderId(raw: unknown): Result<number> {
  const id = typeof raw === "number" ? raw : Number(String(raw ?? "").trim());
  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, error: "ID pesanan tidak valid." };
  }
  return { ok: true, value: id };
}

export function validateStatus(raw: unknown): Result<OrderStatus> {
  if (typeof raw !== "string" || !(ORDER_STATUSES as readonly string[]).includes(raw)) {
    return { ok: false, error: `Status harus salah satu dari: ${ORDER_STATUSES.join(", ")}.` };
  }
  return { ok: true, value: raw as OrderStatus };
}

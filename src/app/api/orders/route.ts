import { NextResponse } from "next/server";
import { deleteOrder, listOrders, updateOrderStatus, createOrder } from "@/lib/store";
import { validateCreateOrder, validateOrderId, validateStatus } from "@/lib/validation";

// Route handler berjalan di Node.js runtime — syarat untuk Netlify Blobs.
export const runtime = "nodejs";
// Data dashboard selalu fresh, tidak di-cache.
export const dynamic = "force-dynamic";

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

/**
 * Proteksi opsional: set env ADMIN_KEY di Netlify (Site configuration →
 * Environment variables) maka POST/PATCH/DELETE butuh header `x-admin-key`.
 * Catatan: ini penghalang sederhana, bukan sistem autentikasi penuh.
 */
function isAuthorized(req: Request): boolean {
  const expected = process.env.ADMIN_KEY;
  if (!expected) return true;
  return req.headers.get("x-admin-key") === expected;
}

export async function GET() {
  try {
    const orders = await listOrders();
    return NextResponse.json(orders);
  } catch (err) {
    console.error("[api/orders] GET gagal:", err);
    return NextResponse.json({ error: "Gagal memuat data pesanan." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Body harus JSON yang valid.");
  }

  const parsed = validateCreateOrder(body);
  if (!parsed.ok) return badRequest(parsed.error);

  try {
    const order = await createOrder(parsed.value);
    return NextResponse.json(order, { status: 201 });
  } catch (err) {
    console.error("[api/orders] POST gagal:", err);
    return NextResponse.json({ error: "Gagal menyimpan pesanan." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Body harus JSON yang valid.");
  }
  const record = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;

  const id = validateOrderId(record.id);
  if (!id.ok) return badRequest(id.error);
  const status = validateStatus(record.status);
  if (!status.ok) return badRequest(status.error);

  try {
    const updated = await updateOrderStatus(id.value, status.value);
    if (!updated) {
      return NextResponse.json({ error: `Pesanan #${id.value} tidak ditemukan.` }, { status: 404 });
    }
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[api/orders] PATCH gagal:", err);
    return NextResponse.json({ error: "Gagal mengubah status." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  }
  const id = validateOrderId(new URL(req.url).searchParams.get("id"));
  if (!id.ok) return badRequest(id.error);

  try {
    const removed = await deleteOrder(id.value);
    if (!removed) {
      return NextResponse.json({ error: `Pesanan #${id.value} tidak ditemukan.` }, { status: 404 });
    }
    return NextResponse.json({ message: "Pesanan dihapus.", id: id.value });
  } catch (err) {
    console.error("[api/orders] DELETE gagal:", err);
    return NextResponse.json({ error: "Gagal menghapus pesanan." }, { status: 500 });
  }
}

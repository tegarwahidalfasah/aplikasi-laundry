import { NextRequest, NextResponse } from "next/server";
import { deleteOrder, listOrders, updateOrderStatus, createOrder, exportOrdersToCSV, updateOrderWithCompensation } from "@/lib/store";
import { validateCreateOrder, validateOrderId, validateStatus, validateCompensation } from "@/lib/validation";
import { verifyLogin, createSession, validateSession, destroySession } from "@/lib/auth";

// Route handler berjalan di Node.js runtime — syarat untuk Netlify Blobs.
export const runtime = "nodejs";
// Data dashboard selalu fresh, tidak di-cache.
export const dynamic = "force-dynamic";

function badRequest(error: string) {
  return NextResponse.json({ error }, { status: 400 });
}

/**
 * Proteksi dengan session-based authentication
 */
function getSession(req: Request): { username: string } | null {
  const token = req.headers.get("x-session-token");
  if (!token) return null;
  return validateSession(token);
}

function unauthorized() {
  return NextResponse.json({ error: "Tidak diizinkan. Silakan login." }, { status: 401 });
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    
    // Endpoint untuk export CSV
    if (searchParams.get("export") === "csv") {
      const session = getSession(req);
      if (!session) return unauthorized();
      
      const csv = await exportOrdersToCSV();
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": 'attachment; filename="laundry-orders.csv"',
        },
      });
    }
    
    // Endpoint untuk list pesanan dengan pagination, search, filter
    const search = searchParams.get("search") || undefined;
    const status = searchParams.get("status") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    
    const result = await listOrders({ search, status, page, limit });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/orders] GET gagal:", err);
    return NextResponse.json({ error: "Gagal memuat data pesanan." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = getSession(req);
  if (!session) return unauthorized();
  
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
  const session = getSession(req);
  if (!session) return unauthorized();
  
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return badRequest("Body harus JSON yang valid.");
  }
  const record = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;

  const id = validateOrderId(record.id);
  if (!id.ok) return badRequest(id.error);
  
  // Handle status update with optional cancellation reason and compensation
  if (record.status !== undefined) {
    const status = validateStatus(record.status);
    if (!status.ok) return badRequest(status.error);
    
    // If cancelling, validate reason
    if (status.value === 'Dibatalkan' && !record.cancellationReason) {
      return badRequest("Alasan pembatalan wajib diisi.");
    }
    
    // Validate compensation if provided
    if (record.compensation !== undefined) {
      const compValidation = validateCompensation(record.compensation);
      if (!compValidation.ok) return badRequest(compValidation.error);
    }

    try {
      const updated = await updateOrderWithCompensation(
        id.value, 
        status.value, 
        record.cancellationReason as string | undefined,
        record.compensation as number | undefined
      );
      if (!updated) {
        return NextResponse.json({ error: `Pesanan #${id.value} tidak ditemukan.` }, { status: 404 });
      }
      return NextResponse.json(updated);
    } catch (err) {
      console.error("[api/orders] PATCH gagal:", err);
      return NextResponse.json({ error: "Gagal mengubah status." }, { status: 500 });
    }
  }
  
  return badRequest("Status wajib diisi.");
}

export async function DELETE(req: Request) {
  const session = getSession(req);
  if (!session) return unauthorized();
  
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

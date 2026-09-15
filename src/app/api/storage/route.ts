import { NextResponse } from "next/server";
import { storageInfo } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Info penyimpanan data, untuk badge di header dashboard. */
export async function GET() {
  try {
    return NextResponse.json(await storageInfo());
  } catch (err) {
    console.error("[api/storage] GET gagal:", err);
    return NextResponse.json({ error: "Gagal membaca info penyimpanan." }, { status: 500 });
  }
}

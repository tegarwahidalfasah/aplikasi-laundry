import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const token = req.headers.get("x-session-token");
  if (token) {
    destroySession(token);
  }
  return NextResponse.json({ success: true });
}

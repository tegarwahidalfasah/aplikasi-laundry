import { NextResponse } from "next/server";
import { validateSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const token = req.headers.get("x-session-token");
  if (!token) {
    return NextResponse.json({ authenticated: false });
  }

  const session = validateSession(token);
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({ 
    authenticated: true, 
    user: { username: session.username }
  });
}

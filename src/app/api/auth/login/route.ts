import { NextResponse } from "next/server";
import { verifyLogin, createSession } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body harus JSON yang valid." }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Body harus berupa objek JSON." }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const username = typeof b.username === "string" ? b.username.trim() : "";
  const password = typeof b.password === "string" ? b.password : "";

  if (!username || !password) {
    return NextResponse.json({ error: "Username dan password wajib diisi." }, { status: 400 });
  }

  const isValid = await verifyLogin(username, password);
  if (!isValid) {
    return NextResponse.json({ error: "Username atau password salah." }, { status: 401 });
  }

  const token = createSession(username);
  return NextResponse.json({ 
    success: true, 
    token,
    user: { username }
  });
}

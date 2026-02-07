import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const orders = await prisma.order.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(orders);
}

export async function POST(req: Request) {
  const body = await req.json();
  const newOrder = await prisma.order.create({
    data: { ...body, weight: Number(body.weight), totalPrice: Number(body.totalPrice) }
  });
  return NextResponse.json(newOrder);
}

export async function PATCH(req: Request) {
  const body = await req.json();
  const updated = await prisma.order.update({
    where: { id: Number(body.id) },
    data: { status: body.status }
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  await prisma.order.delete({ where: { id: Number(id) } });
  return NextResponse.json({ message: "Deleted" });
}
import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  db.prepare("DELETE FROM cart_items WHERE id = ?").run(id);
  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { quantity } = await request.json();

  if (quantity < 1) {
    db.prepare("DELETE FROM cart_items WHERE id = ?").run(id);
    return NextResponse.json({ success: true, removed: true });
  }

  db.prepare("UPDATE cart_items SET quantity = ? WHERE id = ?").run(quantity, id);
  return NextResponse.json({ success: true });
}

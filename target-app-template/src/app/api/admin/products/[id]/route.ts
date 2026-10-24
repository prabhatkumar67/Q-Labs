import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const updates = await request.json();

  const fields: string[] = [];
  const values: (string | number)[] = [];

  if (updates.name !== undefined) {
    fields.push("name = ?");
    values.push(updates.name);
  }
  if (updates.description !== undefined) {
    fields.push("description = ?");
    values.push(updates.description);
  }
  if (updates.price !== undefined) {
    fields.push("price = ?");
    values.push(updates.price);
  }
  if (updates.image_url !== undefined) {
    fields.push("image_url = ?");
    values.push(updates.image_url);
  }
  if (updates.stock_quantity !== undefined) {
    fields.push("stock_quantity = ?");
    values.push(updates.stock_quantity);
  }
  if (updates.category !== undefined) {
    fields.push("category = ?");
    values.push(updates.category);
  }

  if (fields.length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  values.push(Number(id));
  db.prepare(`UPDATE products SET ${fields.join(", ")} WHERE id = ?`).run(
    ...values
  );

  return NextResponse.json({ success: true });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Check if product is referenced in any order items
  const orderRef = db
    .prepare("SELECT COUNT(*) as count FROM order_items WHERE product_id = ?")
    .get(Number(id)) as { count: number };

  if (orderRef.count > 0) {
    return NextResponse.json(
      { error: "Cannot delete product that has been ordered" },
      { status: 400 }
    );
  }

  // Also remove from any carts
  db.prepare("DELETE FROM cart_items WHERE product_id = ?").run(Number(id));
  db.prepare("DELETE FROM products WHERE id = ?").run(Number(id));

  return NextResponse.json({ success: true });
}

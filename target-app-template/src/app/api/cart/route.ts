import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const items = db
    .prepare(
      `SELECT ci.id, ci.product_id, ci.quantity, ci.session_id,
              p.name, p.price, p.stock_quantity, p.image_url
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id`
    )
    .all();
  return NextResponse.json(items);
}

export async function POST(request: NextRequest) {
  try {
    const { product_id, quantity = 1 } = await request.json();

    // Verify product exists
    const product = db
      .prepare("SELECT id, stock_quantity FROM products WHERE id = ?")
      .get(product_id) as { id: number; stock_quantity: number } | undefined;

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    if (product.stock_quantity <= 0) {
      return NextResponse.json(
        { error: "Product is out of stock" },
        { status: 400 }
      );
    }

    // Check if item already in cart
    const existing = db
      .prepare(
        "SELECT id, quantity FROM cart_items WHERE product_id = ? AND session_id = 'default'"
      )
      .get(product_id) as { id: number; quantity: number } | undefined;

    if (existing) {
      const newQty = existing.quantity + quantity;
      if (newQty > product.stock_quantity) {
        return NextResponse.json(
          { error: `Only ${product.stock_quantity} available` },
          { status: 400 }
        );
      }
      db.prepare("UPDATE cart_items SET quantity = ? WHERE id = ?").run(
        newQty,
        existing.id
      );
    } else {
      db.prepare(
        "INSERT INTO cart_items (session_id, product_id, quantity) VALUES ('default', ?, ?)"
      ).run(product_id, quantity);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to add item to cart" },
      { status: 500 }
    );
  }
}

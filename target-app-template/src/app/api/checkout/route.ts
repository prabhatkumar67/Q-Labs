import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function POST() {
  const items = db
    .prepare(
      `SELECT ci.product_id, ci.quantity, p.price, p.name
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.session_id = 'default'`
    )
    .all() as { product_id: number; quantity: number; price: number; name: string }[];

  if (items.length === 0) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  const total = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // Verify stock before checkout
  const stockCheck = db.prepare(
    "SELECT id, name, stock_quantity FROM products WHERE id = ?"
  );
  for (const item of items) {
    const product = stockCheck.get(item.product_id) as {
      id: number;
      name: string;
      stock_quantity: number;
    };
    if (product.stock_quantity < item.quantity) {
      return NextResponse.json(
        {
          error: `Not enough stock for "${product.name}" (${product.stock_quantity} available, ${item.quantity} requested)`,
        },
        { status: 400 }
      );
    }
  }

  const checkout = db.transaction(() => {
    const result = db
      .prepare(
        "INSERT INTO orders (buyer_name, total, status) VALUES (?, ?, 'pending')"
      )
      .run("Customer", Math.round(total * 100) / 100);

    const orderId = result.lastInsertRowid;

    const insertItem = db.prepare(
      "INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)"
    );
    const decrementStock = db.prepare(
      "UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?"
    );

    for (const item of items) {
      insertItem.run(orderId, item.product_id, item.quantity, item.price);
      decrementStock.run(item.quantity, item.product_id);
    }

    db.prepare("DELETE FROM cart_items WHERE session_id = 'default'").run();

    return orderId;
  });

  const orderId = checkout();

  return NextResponse.json({ success: true, order_id: orderId });
}

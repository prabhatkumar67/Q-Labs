import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const totalProducts = db
    .prepare("SELECT COUNT(*) as count FROM products")
    .get() as { count: number };

  const totalOrders = db
    .prepare("SELECT COUNT(*) as count FROM orders")
    .get() as { count: number };

  const totalRevenue = db
    .prepare("SELECT COALESCE(SUM(total), 0) as total FROM orders")
    .get() as { total: number };

  const lowStockProducts = db
    .prepare("SELECT COUNT(*) as count FROM products WHERE stock_quantity <= 10")
    .get() as { count: number };

  const pendingOrders = db
    .prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'pending'")
    .get() as { count: number };

  const deliveredOrders = db
    .prepare("SELECT COUNT(*) as count FROM orders WHERE status = 'delivered'")
    .get() as { count: number };

  const topProducts = db
    .prepare(`
      SELECT p.name, SUM(oi.quantity) as total_sold, SUM(oi.quantity * oi.price) as revenue
      FROM order_items oi
      JOIN products p ON p.id = oi.product_id
      GROUP BY oi.product_id
      ORDER BY total_sold DESC
      LIMIT 5
    `)
    .all();

  return NextResponse.json({
    totalProducts: totalProducts.count,
    totalOrders: totalOrders.count,
    totalRevenue: Math.round(totalRevenue.total * 100) / 100,
    lowStockProducts: lowStockProducts.count,
    pendingOrders: pendingOrders.count,
    deliveredOrders: deliveredOrders.count,
    topProducts,
  });
}

import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const products = db
    .prepare("SELECT id, name, stock_quantity, price, category, image_url FROM products")
    .all();
  return NextResponse.json(products);
}

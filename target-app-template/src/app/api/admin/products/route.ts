import { NextRequest, NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { name, description, price, image_url, stock_quantity, category } =
    await request.json();

  if (!name || price == null || stock_quantity == null) {
    return NextResponse.json(
      { error: "Name, price, and stock quantity are required" },
      { status: 400 }
    );
  }

  const result = db
    .prepare(
      `INSERT INTO products (name, description, price, image_url, stock_quantity, category)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      name,
      description || "",
      price,
      image_url || "",
      stock_quantity,
      category || ""
    );

  return NextResponse.json({
    success: true,
    id: result.lastInsertRowid,
  });
}

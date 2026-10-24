import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const orders = db
    .prepare(
      "SELECT id, buyer_name, total, status, created_at FROM orders ORDER BY created_at DESC LIMIT 20"
    )
    .all();
  return NextResponse.json(orders);
}

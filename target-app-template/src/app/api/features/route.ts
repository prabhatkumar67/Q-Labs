import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    dynamicShipping: process.env.FEATURE_DYNAMIC_SHIPPING === "true",
  });
}

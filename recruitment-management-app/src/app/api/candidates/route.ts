import { NextResponse } from "next/server";
import { z } from "zod";

import { createCandidate, listCandidates } from "@/lib/store";

const CandidateSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  stage: z.enum(["Applied", "Screening", "Interview", "Offer", "Hired", "Rejected"]),
  jobId: z.string().min(1),
  score: z.number().min(0).max(100),
});

export async function GET() {
  const candidates = await listCandidates();
  return NextResponse.json(candidates);
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = CandidateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const created = await createCandidate(parsed.data);
  return NextResponse.json(created, { status: 201 });
}
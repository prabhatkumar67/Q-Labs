import { NextResponse } from "next/server";
import { z } from "zod";

import { createInterview, listInterviews } from "@/lib/store";

const InterviewSchema = z.object({
  candidateId: z.string().min(1),
  jobId: z.string().min(1),
  type: z.enum(["Phone", "Technical", "Panel", "Final"]),
  scheduledAt: z.string().min(1),
  interviewer: z.string().min(2),
  status: z.enum(["Scheduled", "Completed", "Canceled"]),
});

export async function GET() {
  const interviews = await listInterviews();
  return NextResponse.json(interviews);
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = InterviewSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const created = await createInterview(parsed.data);
  return NextResponse.json(created, { status: 201 });
}
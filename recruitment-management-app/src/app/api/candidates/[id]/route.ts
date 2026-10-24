import { NextResponse } from "next/server";
import { z } from "zod";

import { deleteCandidate, updateCandidateStage } from "@/lib/store";

const UpdateSchema = z.object({
  stage: z.enum(["Applied", "Screening", "Interview", "Offer", "Hired", "Rejected"]),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const parsed = UpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await updateCandidateStage(id, parsed.data.stage);
  if (!updated) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: Params) {
  const { id } = await params;
  const deleted = await deleteCandidate(id);

  if (!deleted) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

import { NextResponse } from "next/server";
import { z } from "zod";

import { deleteInterview, updateInterviewStatus } from "@/lib/store";

const UpdateSchema = z.object({
  status: z.enum(["Scheduled", "Completed", "Canceled"]),
});

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const parsed = UpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await updateInterviewStatus(id, parsed.data.status);
  if (!updated) {
    return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: Params) {
  const { id } = await params;
  const deleted = await deleteInterview(id);

  if (!deleted) {
    return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

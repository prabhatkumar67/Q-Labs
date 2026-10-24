import { NextResponse } from "next/server";
import { z } from "zod";

import { createJob, listJobs } from "@/lib/store";

const JobSchema = z.object({
    title: z.string().min(2),
    department: z.string().min(2),
    location: z.string().min(2),
    status: z.enum(["Open", "Paused", "Closed"]),
    openings: z.number().int().min(1),
});

export async function GET() {
    const jobs = await listJobs();
    return NextResponse.json(jobs);
}

export async function POST(request: Request) {
    const body = await request.json();
    const parsed = JobSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const created = await createJob(parsed.data);
    return NextResponse.json(created, { status: 201 });
}
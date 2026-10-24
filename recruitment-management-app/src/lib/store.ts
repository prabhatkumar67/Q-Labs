import db from "@/lib/db";

import { Candidate, Interview, Job } from "@/lib/types";

/* ── Jobs ────────────────────────────────────────────────── */

export async function listJobs(): Promise<Job[]> {
  return db.prepare("SELECT * FROM jobs ORDER BY createdAt DESC").all() as Job[];
}

export async function getJobById(id: string): Promise<Job | null> {
  return (db.prepare("SELECT * FROM jobs WHERE id = ?").get(id) as Job) ?? null;
}

export async function createJob(input: Omit<Job, "id" | "createdAt">): Promise<Job> {
  const item: Job = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...input,
  };
  db.prepare(
    "INSERT INTO jobs (id, title, department, location, status, openings, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(item.id, item.title, item.department, item.location, item.status, item.openings, item.createdAt);
  return item;
}

export async function updateJobStatus(id: string, status: Job["status"]): Promise<Job | null> {
  const result = db.prepare("UPDATE jobs SET status = ? WHERE id = ?").run(status, id);
  if (result.changes === 0) return null;
  return (db.prepare("SELECT * FROM jobs WHERE id = ?").get(id) as Job) ?? null;
}

export async function deleteJob(id: string): Promise<boolean> {
  const result = db.prepare("DELETE FROM jobs WHERE id = ?").run(id);
  return result.changes > 0;
}

/* ── Candidates ──────────────────────────────────────────── */

export async function listCandidates(): Promise<Candidate[]> {
  return db.prepare("SELECT * FROM candidates ORDER BY createdAt DESC").all() as Candidate[];
}

export async function createCandidate(input: Omit<Candidate, "id" | "createdAt">): Promise<Candidate> {
  const item: Candidate = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...input,
  };
  db.prepare(
    "INSERT INTO candidates (id, name, email, stage, jobId, score, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(item.id, item.name, item.email, item.stage, item.jobId, item.score, item.createdAt);
  return item;
}

export async function updateCandidateStage(id: string, stage: Candidate["stage"]): Promise<Candidate | null> {
  const result = db.prepare("UPDATE candidates SET stage = ? WHERE id = ?").run(stage, id);
  if (result.changes === 0) return null;
  return (db.prepare("SELECT * FROM candidates WHERE id = ?").get(id) as Candidate) ?? null;
}

export async function deleteCandidate(id: string): Promise<boolean> {
  const result = db.prepare("DELETE FROM candidates WHERE id = ?").run(id);
  return result.changes > 0;
}

/* ── Interviews ──────────────────────────────────────────── */

export async function listInterviews(): Promise<Interview[]> {
  return db.prepare("SELECT * FROM interviews").all() as Interview[];
}

export async function createInterview(input: Omit<Interview, "id">): Promise<Interview> {
  const item: Interview = {
    id: crypto.randomUUID(),
    ...input,
  };
  db.prepare(
    "INSERT INTO interviews (id, candidateId, jobId, type, scheduledAt, interviewer, status) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(item.id, item.candidateId, item.jobId, item.type, item.scheduledAt, item.interviewer, item.status);
  return item;
}

export async function updateInterviewStatus(id: string, status: Interview["status"]): Promise<Interview | null> {
  const result = db.prepare("UPDATE interviews SET status = ? WHERE id = ?").run(status, id);
  if (result.changes === 0) return null;
  return (db.prepare("SELECT * FROM interviews WHERE id = ?").get(id) as Interview) ?? null;
}

export async function deleteInterview(id: string): Promise<boolean> {
  const result = db.prepare("DELETE FROM interviews WHERE id = ?").run(id);
  return result.changes > 0;
}

/* ── Metrics ─────────────────────────────────────────────── */

export async function getMetrics() {
  const openJobs = (db.prepare("SELECT COUNT(*) as count FROM jobs WHERE status = 'Open'").get() as { count: number }).count;
  const candidates = (db.prepare("SELECT COUNT(*) as count FROM candidates").get() as { count: number }).count;
  const interviewsScheduled = (db.prepare("SELECT COUNT(*) as count FROM interviews WHERE status = 'Scheduled'").get() as { count: number }).count;
  const offers = (db.prepare("SELECT COUNT(*) as count FROM candidates WHERE stage = 'Offer'").get() as { count: number }).count;
  const hires = (db.prepare("SELECT COUNT(*) as count FROM candidates WHERE stage = 'Hired'").get() as { count: number }).count;

  const avgRow = db.prepare("SELECT AVG(score) as avg FROM candidates").get() as { avg: number | null };
  const avgCandidateScore = avgRow.avg ? Math.round(avgRow.avg) : 0;

  const stageCounts: Record<string, number> = {
    Applied: 0,
    Screening: 0,
    Interview: 0,
    Offer: 0,
    Hired: 0,
    Rejected: 0,
  };

  const stageRows = db.prepare("SELECT stage, COUNT(*) as count FROM candidates GROUP BY stage").all() as { stage: string; count: number }[];
  for (const row of stageRows) {
    stageCounts[row.stage] = row.count;
  }

  const upcomingInterviews = db.prepare(
    "SELECT * FROM interviews WHERE status = 'Scheduled' ORDER BY scheduledAt ASC LIMIT 8"
  ).all() as Interview[];

  return {
    openJobs,
    candidates,
    interviewsScheduled,
    offers,
    hires,
    avgCandidateScore,
    stageCounts,
    upcomingInterviews,
  };
}

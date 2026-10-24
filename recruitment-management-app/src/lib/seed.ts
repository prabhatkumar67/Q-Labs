import { faker } from "@faker-js/faker";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

interface RecruitSeedConfig {
  candidate_count?: number;
  job_count?: number;
}

const DEPARTMENTS = [
  "Engineering",
  "Design",
  "Analytics",
  "People",
  "Platform",
  "Quality",
  "Marketing",
  "Sales",
];

const JOB_STATUSES = ["Open", "Open", "Open", "Paused", "Closed"] as const;

const CANDIDATE_STAGES = [
  "Applied",
  "Applied",
  "Applied",
  "Screening",
  "Screening",
  "Interview",
  "Interview",
  "Offer",
  "Hired",
  "Rejected",
  "Rejected",
] as const;

const INTERVIEW_TYPES = ["Phone", "Technical", "Panel", "Final"] as const;
const INTERVIEW_STATUSES = ["Scheduled", "Scheduled", "Completed", "Completed", "Canceled"] as const;

const INTERVIEWERS = [
  "Taylor Morgan",
  "Jordan Smith",
  "Casey Thompson",
  "Alex Kim",
  "Riley Martin",
  "Sam Davis",
  "Quinn Parker",
];

export function seed(dbPath: string, config: RecruitSeedConfig = {}) {
  const {
    candidate_count = 30,
    job_count = Math.min(Math.ceil(candidate_count / 3), 20),
  } = config;

  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      department TEXT NOT NULL,
      location TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Open',
      openings INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS candidates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      stage TEXT NOT NULL DEFAULT 'Applied',
      jobId TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      score REAL NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS interviews (
      id TEXT PRIMARY KEY,
      candidateId TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
      jobId TEXT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      scheduledAt TEXT NOT NULL,
      interviewer TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Scheduled'
    );
  `);

  // Generate jobs
  const insertJob = db.prepare(
    `INSERT INTO jobs (id, title, department, location, status, openings, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  const jobIds: string[] = [];
  const insertJobs = db.transaction(() => {
    for (let i = 0; i < job_count; i++) {
      const id = crypto.randomUUID();
      insertJob.run(
        id,
        faker.person.jobTitle(),
        faker.helpers.arrayElement(DEPARTMENTS),
        faker.location.city() + ", " + faker.location.state({ abbreviated: true }),
        faker.helpers.arrayElement(JOB_STATUSES),
        faker.number.int({ min: 1, max: 5 }),
        faker.date.recent({ days: 30 }).toISOString()
      );
      jobIds.push(id);
    }
  });
  insertJobs();

  // Generate candidates
  const insertCandidate = db.prepare(
    `INSERT INTO candidates (id, name, email, stage, jobId, score, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  const candidateRows: { id: string; stage: string; jobId: string }[] = [];
  const insertCandidates = db.transaction(() => {
    for (let i = 0; i < candidate_count; i++) {
      const id = crypto.randomUUID();
      const stage = faker.helpers.arrayElement(CANDIDATE_STAGES);
      const jobId = faker.helpers.arrayElement(jobIds);
      insertCandidate.run(
        id,
        faker.person.fullName(),
        faker.internet.email(),
        stage,
        jobId,
        Math.round(faker.number.float({ min: 40, max: 100 }) * 10) / 10,
        faker.date.recent({ days: 25 }).toISOString()
      );
      candidateRows.push({ id, stage, jobId });
    }
  });
  insertCandidates();

  // Generate interviews for candidates in Interview/Offer/Hired stages
  const interviewable = candidateRows.filter(
    (c) => c.stage === "Interview" || c.stage === "Offer" || c.stage === "Hired"
  );

  const insertInterview = db.prepare(
    `INSERT INTO interviews (id, candidateId, jobId, type, scheduledAt, interviewer, status) VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  const insertInterviews = db.transaction(() => {
    for (const candidate of interviewable) {
      const count = faker.number.int({ min: 1, max: 2 });
      for (let j = 0; j < count; j++) {
        insertInterview.run(
          crypto.randomUUID(),
          candidate.id,
          candidate.jobId,
          faker.helpers.arrayElement(INTERVIEW_TYPES),
          faker.date.soon({ days: 14 }).toISOString(),
          faker.helpers.arrayElement(INTERVIEWERS),
          faker.helpers.arrayElement(INTERVIEW_STATUSES)
        );
      }
    }
  });
  insertInterviews();

  db.close();
  console.log(
    `Seeded database with ${job_count} jobs, ${candidate_count} candidates, ${interviewable.length} interviewable candidates`
  );
}

// Run if called directly
if (require.main === module) {
  const dbPath =
    process.env.NODE_ENV === "production"
      ? "/app/data/recruit.db"
      : path.join(process.cwd(), "data", "recruit.db");

  if (fs.existsSync(dbPath)) {
    console.log("Database already exists, skipping seed.");
    process.exit(0);
  }

  let config: RecruitSeedConfig = {};
  if (process.env.SCENARIO_CONFIG) {
    try {
      config = JSON.parse(process.env.SCENARIO_CONFIG);
    } catch {
      console.error("Invalid SCENARIO_CONFIG JSON, using defaults");
    }
  }

  if (process.env.SEED_COUNT) {
    const count = parseInt(process.env.SEED_COUNT, 10);
    if (!isNaN(count) && count > 0) {
      if (config.candidate_count === undefined) {
        config.candidate_count = count;
      }
      if (config.job_count === undefined) {
        config.job_count = Math.min(Math.ceil(count / 3), 20);
      }
    }
  }

  seed(dbPath, config);
}

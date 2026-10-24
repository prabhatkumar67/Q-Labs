export type JobStatus = "Open" | "Paused" | "Closed";

export type CandidateStage =
  | "Applied"
  | "Screening"
  | "Interview"
  | "Offer"
  | "Hired"
  | "Rejected";

export type InterviewType = "Phone" | "Technical" | "Panel" | "Final";
export type InterviewStatus = "Scheduled" | "Completed" | "Canceled";

export type Job = {
  id: string;
  title: string;
  department: string;
  location: string;
  status: JobStatus;
  openings: number;
  createdAt: string;
};

export type Candidate = {
  id: string;
  name: string;
  email: string;
  stage: CandidateStage;
  jobId: string;
  score: number;
  createdAt: string;
};

export type Interview = {
  id: string;
  candidateId: string;
  jobId: string;
  type: InterviewType;
  scheduledAt: string;
  interviewer: string;
  status: InterviewStatus;
};

export type Store = {
  jobs: Job[];
  candidates: Candidate[];
  interviews: Interview[];
};
